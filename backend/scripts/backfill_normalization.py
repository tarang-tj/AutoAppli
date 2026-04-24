#!/usr/bin/env python3
"""
Backfill normalization columns on cached_jobs and jobs.

Part of PR 1 of the Job Data Quality project. Run once after the
20260424140000_normalization_columns.sql migration applies. Subsequent ingest
runs populate new rows automatically via NormalizedJob.__post_init__; this
script catches the rows that existed before the migration.

Usage:
    python -m backend.scripts.backfill_normalization
    python -m backend.scripts.backfill_normalization --dry-run
    python -m backend.scripts.backfill_normalization --table cached_jobs
    python -m backend.scripts.backfill_normalization --table jobs
    python -m backend.scripts.backfill_normalization --limit 500    # smoke-test first

Environment:
    SUPABASE_URL                — required (unless --dry-run).
    SUPABASE_SERVICE_ROLE_KEY   — required (unless --dry-run).

Behavior:
    1. Query rows where `normalized_version` is null or older than the
       module-level NORMALIZER_VERSION constant.
    2. For each row, run normalize_location(row.location) and
       normalize_company(row.company).
    3. PATCH the row with the normalized fields + bumped normalized_version.
    4. Idempotent: re-running picks up only rows still out of date.

Exit codes:
    0 — ran to completion (or dry-run summary printed).
    1 — bad invocation or Supabase creds missing.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

# Allow running as `python backend/scripts/backfill_normalization.py`.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.services.ingestion.normalizers import (  # noqa: E402
    NORMALIZER_VERSION,
    normalize_company,
    normalize_location,
    should_mark_remote,
)


FETCH_PAGE_SIZE = 500
UPDATE_BATCH_SIZE = 200
VALID_TABLES = ("cached_jobs", "jobs")


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
            "to backfill. Use --dry-run to skip Supabase."
        )
    return url.rstrip("/"), key


def _fetch_page(
    supabase_url: str,
    key: str,
    table: str,
    offset: int,
    limit: int,
) -> list[dict[str, Any]]:
    # Rows needing backfill: normalized_version null, 0, or older than current.
    # PostgREST `or` takes a comma-separated list of column filters.
    # We fetch the identity (id) plus the inputs we need to normalize.
    fields = "id,source,company,location,remote_type,normalized_version"
    filter_clause = (
        "or=("
        "normalized_version.is.null,"
        f"normalized_version.lt.{NORMALIZER_VERSION}"
        ")"
    )
    endpoint = (
        f"{supabase_url}/rest/v1/{table}"
        f"?select={fields}"
        f"&{filter_clause}"
        f"&limit={limit}"
        f"&offset={offset}"
        f"&order=id.asc"
    )
    req = urllib.request.Request(
        endpoint,
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(
            f"Supabase fetch failed (HTTP {e.code}) on {table}: {body}"
        )


def _patch_row(
    supabase_url: str,
    key: str,
    table: str,
    row_id: str,
    payload: dict[str, Any],
) -> None:
    endpoint = f"{supabase_url}/rest/v1/{table}?id=eq.{row_id}"
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        method="PATCH",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:200]
        raise RuntimeError(
            f"Supabase patch failed (HTTP {e.code}) on {table}/{row_id}: {body}"
        )


# ---------------------------------------------------------------------------
# Backfill logic
# ---------------------------------------------------------------------------

def _compute_payload(row: dict[str, Any]) -> dict[str, Any]:
    """Run the normalizer on a single row and return the PATCH payload."""
    loc = normalize_location(row.get("location") or "", row.get("source") or "")
    remote_bool = should_mark_remote(row.get("remote_type"), loc.is_remote)
    return {
        "location_city": loc.city,
        "location_region": loc.region,
        "location_country": loc.country,
        "location_is_remote": remote_bool,
        "company_normalized": normalize_company(
            row.get("company") or "", row.get("source") or ""
        ),
        "normalized_version": NORMALIZER_VERSION,
    }


def _backfill_table(
    supabase_url: str | None,
    key: str | None,
    table: str,
    dry_run: bool,
    limit: int | None,
) -> dict[str, Any]:
    """Walk a single table, normalize, patch. Returns a summary dict."""
    assert table in VALID_TABLES

    if dry_run:
        # In dry-run we still simulate fetching/normalizing to catch obvious
        # errors, but we skip the network. Fabricate an empty summary.
        print(f"[dry-run] skipping network call for table={table}", file=sys.stderr)
        return {
            "table": table,
            "dry_run": True,
            "scanned": 0,
            "updated": 0,
            "elapsed_ms": 0,
        }

    assert supabase_url and key
    start = time.monotonic()
    scanned = 0
    updated = 0
    offset = 0

    while True:
        page_size = FETCH_PAGE_SIZE
        if limit is not None:
            remaining = limit - scanned
            if remaining <= 0:
                break
            page_size = min(page_size, remaining)

        page = _fetch_page(supabase_url, key, table, offset, page_size)
        if not page:
            break

        for row in page:
            scanned += 1
            payload = _compute_payload(row)
            _patch_row(supabase_url, key, table, row["id"], payload)
            updated += 1

        # PostgREST returns at most `limit` rows; if we got fewer, we're done.
        if len(page) < page_size:
            break
        offset += len(page)

    elapsed_ms = int((time.monotonic() - start) * 1000)
    return {
        "table": table,
        "dry_run": False,
        "scanned": scanned,
        "updated": updated,
        "elapsed_ms": elapsed_ms,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Backfill normalization columns on cached_jobs and jobs"
    )
    ap.add_argument(
        "--table",
        choices=list(VALID_TABLES) + ["all"],
        default="all",
        help="Which table to backfill (default: all)",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip Supabase network calls; print what would run",
    )
    ap.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max rows per table — useful for a smoke test on a subset",
    )
    args = ap.parse_args()

    supabase_url: str | None = None
    key: str | None = None
    if not args.dry_run:
        supabase_url, key = _supabase_creds()

    tables: list[str] = (
        list(VALID_TABLES) if args.table == "all" else [args.table]
    )

    print(f"Backfill target normalized_version={NORMALIZER_VERSION}", file=sys.stderr)

    results: list[dict[str, Any]] = []
    for table in tables:
        print(f"[{table}] starting backfill", file=sys.stderr)
        summary = _backfill_table(supabase_url, key, table, args.dry_run, args.limit)
        results.append(summary)
        if summary["dry_run"]:
            print(f"[{table}] dry-run (no-op)", file=sys.stderr)
        else:
            print(
                f"[{table}] done — scanned {summary['scanned']}, "
                f"updated {summary['updated']} "
                f"({summary['elapsed_ms']}ms)",
                file=sys.stderr,
            )

    total_updated = sum(r["updated"] for r in results)
    total_scanned = sum(r["scanned"] for r in results)
    print(
        f"Total: scanned {total_scanned}, updated {total_updated}",
        file=sys.stderr,
    )

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
