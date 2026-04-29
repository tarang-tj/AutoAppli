#!/usr/bin/env python3
"""
Run every configured ingestion source and upsert into `cached_jobs`.

Usage:
    python -m backend.scripts.ingest_all
    python -m backend.scripts.ingest_all --config ingestion-config.json
    python -m backend.scripts.ingest_all --dry-run
    python -m backend.scripts.ingest_all --source greenhouse,lever
    python -m backend.scripts.ingest_all --no-deactivate

Environment:
    SUPABASE_URL                — required (unless --dry-run).
    SUPABASE_SERVICE_ROLE_KEY   — required (unless --dry-run).
                                  Falls back to SUPABASE_KEY for parity with
                                  ingest.py.
    INGEST_CONFIG_PATH          — optional override for the default config
                                  path (`ingestion-config.json` at repo root).

Behaviour:
    1. Capture `run_started_at` (UTC).
    2. For each source listed in the config, call `source.fetch(slugs)` and
       upsert the resulting rows into `public.cached_jobs` in batches.
       Per-source failures are logged and skipped — one provider being down
       must not abort the whole run.
    3. Unless `--no-deactivate` is set, sweep all rows where
       `inactive_at IS NULL AND last_seen_at < $run_started_at` and set
       `inactive_at = now()`. Rows re-found in a later run get
       `inactive_at` cleared by the upsert (we explicitly write NULL).

Exit codes:
    0 — run completed (even if some sources failed). Source failures show
        up in the summary with a `[FAILED]` marker; downstream alerting can
        parse the JSON summary written to `--summary-out`.
    1 — bad CLI invocation (missing config, unknown source, etc.).
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Iterable

# Allow running as `python backend/scripts/ingest_all.py` without installing.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.services.ingestion import list_sources  # noqa: E402
from backend.app.services.ingestion.base import (  # noqa: E402
    NormalizedJob,
    dedupe_jobs,
)
from backend.app.services.ingestion.dedup import (  # noqa: E402
    canonical_url,
    compute_posting_key,
    raw_hash,
)


DEFAULT_CONFIG = ROOT / "ingestion-config.json"
UPSERT_BATCH_SIZE = 200  # PostgREST handles ~500 comfortably; 200 leaves headroom.

# Default source priority when a source in the flat config shape doesn't
# declare one explicitly. 999 ensures unknown/legacy sources lose to any
# configured tier — PR 3's merge picks the lowest numeric priority.
_DEFAULT_PRIORITY = 999


def _shadow_write_enabled() -> bool:
    """PR 2 shadow-write activation switch.

    Off by default — the env var is a rollback lever, so the lever
    only works as designed if "unset" means "not yet rolled out".
    Set `JOBS_DEDUP_V1=true|1|yes|on` in the cron environment to
    enable shadow-write of `posting_key` and `cached_jobs_sightings`.
    """
    raw = os.environ.get("JOBS_DEDUP_V1", "false").strip().lower()
    return raw in ("true", "1", "yes", "on")


# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------

def _load_config(path: Path) -> dict[str, dict[str, Any]]:
    """Load ingestion config. Accepts both shapes:

    Flat — legacy::

        {"sources": {"greenhouse": ["airbnb", "stripe"], ...}}

    Rich — PR 2+::

        {"sources": {
            "greenhouse": {"priority": 2, "slugs": ["airbnb", "stripe"]},
            ...
         }}

    Returns ``{source_name: {"slugs": [...], "priority": int}}``.
    Sources in the flat shape default to priority ``_DEFAULT_PRIORITY``.
    Keys starting with ``_`` are skipped (reserved for config comments).
    """
    if not path.exists():
        raise SystemExit(f"Config not found: {path}")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise SystemExit(f"Config {path} is not valid JSON: {e}")

    sources_block = raw.get("sources") if isinstance(raw, dict) else None
    if not isinstance(sources_block, dict):
        raise SystemExit(
            f"Config {path} must have a top-level 'sources' object."
        )

    out: dict[str, dict[str, Any]] = {}
    for name, entry in sources_block.items():
        if name.startswith("_"):
            continue
        priority: int
        if isinstance(entry, list):
            slugs_raw = entry
            priority = _DEFAULT_PRIORITY
        elif isinstance(entry, dict):
            slugs_raw = entry.get("slugs")
            if not isinstance(slugs_raw, list):
                raise SystemExit(
                    f"Config {path}: 'sources.{name}.slugs' must be a list of strings"
                )
            priority_raw = entry.get("priority", _DEFAULT_PRIORITY)
            try:
                priority = int(priority_raw)
            except (TypeError, ValueError):
                raise SystemExit(
                    f"Config {path}: 'sources.{name}.priority' must be an integer"
                )
        else:
            raise SystemExit(
                f"Config {path}: 'sources.{name}' must be a list of slugs "
                "or an object with 'priority' and 'slugs'"
            )
        slugs = [str(s).strip() for s in slugs_raw if isinstance(s, str) and s.strip()]
        if slugs:
            out[name] = {"slugs": slugs, "priority": priority}
    return out


# ---------------------------------------------------------------------------
# Supabase wire helpers
# ---------------------------------------------------------------------------

def _supabase_creds() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL")
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_KEY")
    )
    if not url or not key:
        raise SystemExit(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
            "to upsert. Use --dry-run to skip."
        )
    return url.rstrip("/"), key


def _row_for_cached(job: NormalizedJob) -> dict[str, Any]:
    """Convert a NormalizedJob into a cached_jobs row.

    We deliberately set `inactive_at = None` on every upsert so a row that
    was previously marked inactive gets revived when the source returns it
    again. `last_seen_at` is also stamped here (server-side default would
    only fire on insert, not update).

    `last_verified_at` is the meaningful freshness signal (distinct from the
    firehose heartbeat `last_seen_at`). We bump it on every successful
    ingest of this row. PR 3 uses it for decay scoring.

    When shadow-write is enabled (PR 2), `posting_key` is attached so the
    row picks up its cross-source canonical identity on insert.
    """
    row = job.to_row()
    now_iso = _dt.datetime.now(_dt.timezone.utc).isoformat()
    row["last_seen_at"] = now_iso
    row["last_verified_at"] = now_iso
    row["inactive_at"] = None
    if _shadow_write_enabled():
        row["posting_key"] = compute_posting_key(job)
    return row


def _sighting_row(job: NormalizedJob, now_iso: str) -> dict[str, Any]:
    """Build a row for cached_jobs_sightings.

    One row per (source, external_id). The `missing=default` prefer
    header on upsert ensures `first_seen_at` stays at its DB default on
    insert and is left untouched on update.
    """
    return {
        "source": job.source,
        "external_id": job.external_id,
        "posting_key": compute_posting_key(job),
        "url": canonical_url(job.url),
        "raw_hash": raw_hash(job),
        "last_seen_at": now_iso,
    }


def _upsert_batch(supabase_url: str, key: str, rows: list[dict[str, Any]]) -> None:
    endpoint = f"{supabase_url}/rest/v1/cached_jobs?on_conflict=source,external_id"
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "apikey": key,
            # merge-duplicates: existing rows get updated; missing-default
            # would otherwise null out columns we didn't touch.
            "Prefer": "resolution=merge-duplicates,return=minimal,missing=default",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"Supabase upsert failed (HTTP {e.code}): {body}")


def _upsert_sightings_batch(
    supabase_url: str,
    key: str,
    rows: list[dict[str, Any]],
) -> None:
    """Shadow-write path: upsert rows into cached_jobs_sightings.

    Same upsert idiom as cached_jobs (on_conflict=source,external_id,
    merge-duplicates, missing=default). Separate endpoint keeps the
    cached_jobs write unaffected if this fails mid-flight.
    """
    endpoint = (
        f"{supabase_url}/rest/v1/cached_jobs_sightings"
        f"?on_conflict=source,external_id"
    )
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Prefer": "resolution=merge-duplicates,return=minimal,missing=default",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(
            f"Supabase sightings upsert failed (HTTP {e.code}): {body}"
        )


def _touch_heartbeat(supabase_url: str, key: str) -> None:
    """Upsert the singleton row in ingestion_heartbeat to now().

    Uses the same raw-HTTP pattern as the rest of this script so we don't
    need supabase-py at cron runtime. Failure is logged but does NOT abort
    the run — the heartbeat is observability infrastructure, not critical path.
    """
    now_iso = _dt.datetime.now(_dt.timezone.utc).isoformat()
    endpoint = (
        f"{supabase_url}/rest/v1/ingestion_heartbeat?on_conflict=id"
    )
    payload = json.dumps({"id": "singleton", "last_run_at": now_iso}).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp.read()
    except Exception as exc:  # noqa: BLE001
        print(f"[heartbeat] WARNING: failed to update ingestion_heartbeat: {exc}", file=sys.stderr)


def _sweep_inactive(supabase_url: str, key: str, run_started: _dt.datetime) -> int:
    """Mark all rows untouched this run as inactive. Returns the count."""
    iso = run_started.isoformat()

    # Step 1 — count what we're about to mark, so the summary stays honest.
    count_endpoint = (
        f"{supabase_url}/rest/v1/cached_jobs"
        f"?select=id&inactive_at=is.null&last_seen_at=lt.{iso}"
    )
    count_req = urllib.request.Request(
        count_endpoint,
        method="HEAD",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Prefer": "count=exact",
            "Range": "0-0",
        },
    )
    deactivated_count = 0
    try:
        with urllib.request.urlopen(count_req, timeout=30) as resp:
            content_range = resp.headers.get("Content-Range") or ""
            # Format is e.g. "0-0/47" or "*/47"; we want the number after `/`.
            if "/" in content_range:
                tail = content_range.split("/", 1)[1].strip()
                if tail.isdigit():
                    deactivated_count = int(tail)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:200]
        raise RuntimeError(f"Supabase sweep count failed (HTTP {e.code}): {body}")

    if deactivated_count == 0:
        return 0

    # Step 2 — issue the UPDATE.
    patch_endpoint = (
        f"{supabase_url}/rest/v1/cached_jobs"
        f"?inactive_at=is.null&last_seen_at=lt.{iso}"
    )
    now_iso = _dt.datetime.now(_dt.timezone.utc).isoformat()
    patch_req = urllib.request.Request(
        patch_endpoint,
        data=json.dumps({"inactive_at": now_iso}).encode("utf-8"),
        method="PATCH",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(patch_req, timeout=60) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:200]
        raise RuntimeError(f"Supabase sweep update failed (HTTP {e.code}): {body}")

    return deactivated_count


# ---------------------------------------------------------------------------
# Per-source runner
# ---------------------------------------------------------------------------

def _run_source(
    name: str,
    slugs: list[str],
    supabase_url: str | None,
    key: str | None,
    dry_run: bool,
) -> dict[str, Any]:
    """Fetch + upsert a single source. Returns a per-source summary dict."""
    sources = list_sources()
    factory = sources.get(name)
    if not factory:
        return {
            "source": name,
            "ok": False,
            "error": f"unknown source (known: {', '.join(sorted(sources))})",
            "slugs_total": len(slugs),
            "slugs_failed": len(slugs),
            "jobs": 0,
            "elapsed_ms": 0,
        }

    source = factory()
    start = time.monotonic()
    all_jobs: list[NormalizedJob] = []
    failed_slugs: list[dict[str, str]] = []

    for slug in slugs:
        try:
            jobs = source.fetch([slug])
            all_jobs.extend(jobs)
        except Exception as e:  # noqa: BLE001 — per-slug isolation is the point
            failed_slugs.append({"slug": slug, "error": (str(e) or type(e).__name__)[:200]})

    deduped = dedupe_jobs(all_jobs)
    rows = [_row_for_cached(j) for j in deduped]

    upserted = 0
    upsert_error: str | None = None
    if rows and not dry_run and supabase_url and key:
        try:
            for i in range(0, len(rows), UPSERT_BATCH_SIZE):
                _upsert_batch(supabase_url, key, rows[i : i + UPSERT_BATCH_SIZE])
            upserted = len(rows)
        except RuntimeError as e:
            upsert_error = str(e)

    sightings_upserted = 0
    sightings_error: str | None = None
    if (
        deduped
        and not dry_run
        and supabase_url
        and key
        and upsert_error is None
        and _shadow_write_enabled()
    ):
        now_iso = _dt.datetime.now(_dt.timezone.utc).isoformat()
        sighting_rows = [_sighting_row(j, now_iso) for j in deduped]
        try:
            for i in range(0, len(sighting_rows), UPSERT_BATCH_SIZE):
                _upsert_sightings_batch(
                    supabase_url, key, sighting_rows[i : i + UPSERT_BATCH_SIZE]
                )
            sightings_upserted = len(sighting_rows)
        except RuntimeError as e:
            # Shadow-write must NOT fail the run — cached_jobs already
            # landed; we just lose the audit trail for this batch.
            sightings_error = str(e)

    elapsed_ms = int((time.monotonic() - start) * 1000)
    return {
        "source": name,
        "ok": upsert_error is None,
        "error": upsert_error,
        "slugs_total": len(slugs),
        "slugs_failed": len(failed_slugs),
        "failed_slugs": failed_slugs,
        "jobs": len(rows),
        "upserted": upserted,
        "sightings_upserted": sightings_upserted,
        "sightings_error": sightings_error,
        "elapsed_ms": elapsed_ms,
    }


# ---------------------------------------------------------------------------
# Pretty-printing
# ---------------------------------------------------------------------------

def _print_summary(
    run_started: _dt.datetime,
    results: list[dict[str, Any]],
    deactivated: int,
) -> None:
    use_color = sys.stderr.isatty()
    green = "\033[32m" if use_color else ""
    red = "\033[31m" if use_color else ""
    yellow = "\033[33m" if use_color else ""
    dim = "\033[2m" if use_color else ""
    reset = "\033[0m" if use_color else ""

    print(f"[run_started_at={run_started.isoformat()}]", file=sys.stderr)
    width = max((len(r["source"]) for r in results), default=10)
    total_jobs = 0
    total_upserted = 0
    total_sightings = 0
    for r in results:
        name = r["source"].ljust(width)
        if not r["ok"]:
            print(
                f"  {red}✗{reset} {name}  [FAILED] {r.get('error') or 'unknown error'}",
                file=sys.stderr,
            )
            continue
        slug_note = ""
        if r["slugs_failed"]:
            slug_note = f" {yellow}[{r['slugs_failed']} of {r['slugs_total']} slugs failed]{reset}"
        # Show both fetched and upserted when they differ (dry-run leaves
        # upserted at 0, so this keeps the per-source line honest).
        if r["upserted"] == r["jobs"]:
            jobs_part = f"{r['upserted']:>4} jobs"
        else:
            jobs_part = f"{r['jobs']:>4} fetched / {r['upserted']} upserted"
        sightings_note = ""
        sightings_count = r.get("sightings_upserted", 0)
        if r.get("sightings_error"):
            sightings_note = (
                f" {yellow}[sightings: {r['sightings_error'][:60]}…]{reset}"
            )
        elif sightings_count:
            sightings_note = f" {dim}+{sightings_count} sightings{reset}"
        print(
            f"  {green}✓{reset} {name}  "
            f"{jobs_part} across {r['slugs_total']} slugs "
            f"{dim}({r['elapsed_ms']}ms){reset}{slug_note}{sightings_note}",
            file=sys.stderr,
        )
        total_jobs += r["jobs"]
        total_upserted += r["upserted"]
        total_sightings += sightings_count

    sightings_total_part = (
        f", {total_sightings} sightings" if total_sightings else ""
    )
    print(
        f"Total: {total_upserted} upserted "
        f"({total_jobs} fetched), {deactivated} marked inactive"
        f"{sightings_total_part}",
        file=sys.stderr,
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description="Run all configured job ingestion sources")
    ap.add_argument(
        "--config",
        type=Path,
        default=Path(os.environ.get("INGEST_CONFIG_PATH") or DEFAULT_CONFIG),
        help=f"Path to JSON config (default: {DEFAULT_CONFIG.relative_to(ROOT)})",
    )
    ap.add_argument(
        "--source",
        help="Comma-separated source names — restrict the run to these sources only",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip Supabase writes; print summary and exit 0",
    )
    ap.add_argument(
        "--no-deactivate",
        action="store_true",
        help="Skip the post-run sweep that marks unseen rows inactive",
    )
    ap.add_argument(
        "--summary-out",
        type=Path,
        help="Write a machine-readable JSON summary to this path",
    )
    args = ap.parse_args()

    config = _load_config(args.config)

    if args.source:
        wanted = {s.strip() for s in args.source.split(",") if s.strip()}
        config = {k: v for k, v in config.items() if k in wanted}
        if not config:
            print(
                f"--source {args.source} matched no configured sources", file=sys.stderr
            )
            return 1

    supabase_url: str | None = None
    key: str | None = None
    if not args.dry_run:
        supabase_url, key = _supabase_creds()

    run_started = _dt.datetime.now(_dt.timezone.utc)
    results: list[dict[str, Any]] = []
    for name, entry in config.items():
        result = _run_source(name, entry["slugs"], supabase_url, key, args.dry_run)
        result["priority"] = entry["priority"]
        results.append(result)

    deactivated = 0
    if not args.dry_run and not args.no_deactivate and supabase_url and key:
        try:
            deactivated = _sweep_inactive(supabase_url, key, run_started)
        except RuntimeError as e:
            print(f"Sweep failed: {e}", file=sys.stderr)
            # Don't fail the whole run — sweep can be re-run on the next tick.

    # Update the heartbeat AFTER the sweep so last_run_at reflects a
    # fully-completed run, not just the start. Skip on --dry-run.
    if not args.dry_run and supabase_url and key:
        _touch_heartbeat(supabase_url, key)

    _print_summary(run_started, results, deactivated)

    if args.summary_out:
        summary = {
            "run_started_at": run_started.isoformat(),
            "shadow_write_enabled": _shadow_write_enabled(),
            "deactivated": deactivated,
            "sources": results,
            "totals": {
                "fetched": sum(r["jobs"] for r in results),
                "upserted": sum(r["upserted"] for r in results),
                "sightings_upserted": sum(
                    r.get("sightings_upserted", 0) for r in results
                ),
                "failed_sources": sum(1 for r in results if not r["ok"]),
            },
        }
        args.summary_out.write_text(json.dumps(summary, indent=2))
        print(f"Wrote summary to {args.summary_out}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        try:
            sys.stdout.close()
        except Exception:
            pass
        raise SystemExit(0)
