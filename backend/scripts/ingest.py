#!/usr/bin/env python3
"""
Ingest jobs from external sources into Supabase.

Usage:
    python -m backend.scripts.ingest --source greenhouse --ids airbnb,stripe,anthropic
    python -m backend.scripts.ingest --source greenhouse --ids airbnb --dry-run
    python -m backend.scripts.ingest --source greenhouse --ids airbnb --out jobs.json

Environment:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — required unless --dry-run.

Output:
    Prints a summary to stderr. With --dry-run, writes normalized jobs to
    stdout as JSON and skips the upsert.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

# Allow running as `python backend/scripts/ingest.py` without installing
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.services.ingestion import list_sources  # noqa: E402
from backend.app.services.ingestion.base import dedupe_jobs  # noqa: E402


def _build_source(name: str):
    sources = list_sources()
    factory = sources.get(name)
    if not factory:
        raise SystemExit(f"Unknown source '{name}'. Known: {', '.join(sorted(sources))}")
    return factory()


def _upsert_to_supabase(rows: list[dict]) -> int:
    """Upsert rows into Supabase `jobs` table via the REST API.

    We deliberately don't import supabase-py to keep the script's deps small
    when it runs as a cron. A direct HTTP POST to PostgREST works for upsert.
    """
    import urllib.request
    import urllib.error

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise SystemExit(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upsert. "
            "Use --dry-run to skip."
        )

    endpoint = f"{url.rstrip('/')}/rest/v1/jobs?on_conflict=source,external_id"
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(rows).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:200]
        raise SystemExit(f"Supabase upsert failed: HTTP {e.code}: {body}")
    return len(rows)


def main() -> int:
    ap = argparse.ArgumentParser(description="Ingest jobs from an external source")
    ap.add_argument("--source", required=True, help="Source name (e.g. 'greenhouse')")
    ap.add_argument("--ids", required=True, help="Comma-separated board/company identifiers")
    ap.add_argument("--out", type=Path, default=None, help="Write normalized jobs to this JSON file")
    ap.add_argument("--dry-run", action="store_true", help="Skip Supabase upsert")
    args = ap.parse_args()

    source = _build_source(args.source)
    identifiers = [i.strip() for i in args.ids.split(",") if i.strip()]

    print(f"Fetching {args.source} for: {', '.join(identifiers)}", file=sys.stderr)
    jobs = source.fetch(identifiers)
    jobs = dedupe_jobs(jobs)
    rows = [j.to_row() for j in jobs]

    print(f"Fetched {len(rows)} unique jobs", file=sys.stderr)

    if args.out:
        args.out.write_text(json.dumps(rows, indent=2, ensure_ascii=False))
        print(f"Wrote {args.out}", file=sys.stderr)

    if args.dry_run:
        try:
            print(json.dumps(rows, indent=2, ensure_ascii=False))
        except BrokenPipeError:
            # Downstream consumer (head, less, etc.) closed the pipe. Not an error.
            try:
                sys.stdout.close()
            except Exception:
                pass
        return 0

    inserted = _upsert_to_supabase(rows)
    print(f"Upserted {inserted} rows to Supabase.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        # Final safety net: suppress the interpreter's stderr trace when a
        # downstream pipe closes mid-flush (e.g. `... | head`).
        try:
            sys.stdout.close()
        except Exception:
            pass
        raise SystemExit(0)
