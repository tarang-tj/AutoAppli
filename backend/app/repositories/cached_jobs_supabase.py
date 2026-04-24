"""
Read access to the `public.cached_jobs` firehose.

Writes to this table come from the nightly ingestion cron (see
`.github/workflows/ingest-cached-jobs.yml`). Reads are shared between
the Discover / Recommendations rail and the live search endpoint.

All queries here use the service-role Supabase client and filter on
`inactive_at IS NULL` so the Discover page never surfaces a row that
the last sweep marked dead.
"""
from __future__ import annotations

from typing import Optional

from supabase import Client, create_client

from app.config import Settings


def _client(settings: Settings) -> Client:
    return create_client(settings.SUPABASE_URL.strip(), settings.SUPABASE_KEY.strip())


def search_cached_jobs(
    settings: Settings,
    query: str,
    location: Optional[str] = None,
    remote_only: bool = False,
    limit: int = 50,
) -> list[dict]:
    """Full-text-ish search across cached_jobs.

    We don't have a tsvector column yet, so this uses Postgres `ilike`
    on title + company + description. Fast enough at the scale we
    expect (tens of thousands of rows) because of the active/recent
    partial index and the company b-tree.
    """
    sb = _client(settings)
    q = sb.table("cached_jobs").select("*").is_("inactive_at", "null")

    if query:
        # Supabase `or` filter across columns.
        pattern = f"%{query}%"
        q = q.or_(
            f"title.ilike.{pattern},company.ilike.{pattern},description.ilike.{pattern}"
        )

    if location:
        q = q.ilike("location", f"%{location}%")

    if remote_only:
        q = q.eq("remote_type", "remote")

    q = q.order("last_seen_at", desc=True).limit(limit)

    try:
        res = q.execute()
    except Exception:
        return []

    return res.data or []


def list_recent_cached_jobs(
    settings: Settings, limit: int = 200
) -> list[dict]:
    """Latest active cached jobs. Used by Discover when no query is provided."""
    sb = _client(settings)
    try:
        res = (
            sb.table("cached_jobs")
            .select("*")
            .is_("inactive_at", "null")
            .order("last_seen_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception:
        return []
    return res.data or []
