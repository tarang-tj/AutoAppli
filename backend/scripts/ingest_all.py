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


DEFAULT_CONFIG = ROOT / "ingestion-config.json"
UPSERT_BATCH_SIZE = 200  # PostgREST handles ~500 comfortably; 200 leaves headroom.


# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------

def _load_config(path: Path) -> dict[str, list[str]]:
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

    out: dict[str, list[str]] = {}
    for name, slugs in sources_block.items():
        if name.startswith("_"):
            continue
        if not isinstance(slugs, list):
            raise SystemExit(
                f"Config {path}: 'sources.{name}' must be a list of strings"
            )
        cleaned = [str(s).strip() for s in slugs if isinstance(s, str) and s.strip()]
        if cleaned:
            out[name] = cleaned
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
    """
    row = job.to_row()
    now_iso = _dt.datetime.now(_dt.timezone.utc).isoformat()
    row["last_seen_at"] = now_iso
    row["last_verified_at"] = now_iso
    row["inactive_at"] = None
    return row


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
        print(
            f"  {green}✓{reset} {name}  "
            f"{jobs_part} across {r['slugs_total']} slugs "
            f"{dim}({r['elapsed_ms']}ms){reset}{slug_note}",
            file=sys.stderr,
        )
        total_jobs += r["jobs"]
        total_upserted += r["upserted"]

    print(
        f"Total: {total_upserted} upserted "
        f"({total_jobs} fetched), {deactivated} marked inactive",
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
    for name, slugs in config.items():
        result = _run_source(name, slugs, supabase_url, key, args.dry_run)
        results.append(result)

    deactivated = 0
    if not args.dry_run and not args.no_deactivate and supabase_url and key:
        try:
            deactivated = _sweep_inactive(supabase_url, key, run_started)
        except RuntimeError as e:
            print(f"Sweep failed: {e}", file=sys.stderr)
            # Don't fail the whole run — sweep can be re-run on the next tick.

    _print_summary(run_started, results, deactivated)

    if args.summary_out:
        summary = {
            "run_started_at": run_started.isoformat(),
            "deactivated": deactivated,
            "sources": results,
            "totals": {
                "fetched": sum(r["jobs"] for r in results),
                "upserted": sum(r["upserted"] for r in results),
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
