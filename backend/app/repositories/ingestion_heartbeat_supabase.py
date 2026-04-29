"""
Read/write access to `public.ingestion_heartbeat`.

The table holds a single row (id = 'singleton') updated by the ingestion cron
after each non-dry-run. The health endpoint reads this row to report freshness.
All writes use the service-role key (bypasses RLS); reads work with any key.
"""
from __future__ import annotations

import datetime as _dt
from typing import Optional

from supabase import Client, create_client

from app.config import Settings

_STALE_THRESHOLD_SECONDS = 6 * 3600  # 6 hours
_SINGLETON_ID = "singleton"


def _client(settings: Settings) -> Client:
    return create_client(settings.SUPABASE_URL.strip(), settings.SUPABASE_KEY.strip())


def update_heartbeat(settings: Settings) -> None:
    """Stamp last_run_at = now(). Called at the end of each successful cron run."""
    sb = _client(settings)
    now_iso = _dt.datetime.now(_dt.timezone.utc).isoformat()
    sb.table("ingestion_heartbeat").upsert(
        {"id": _SINGLETON_ID, "last_run_at": now_iso},
        on_conflict="id",
    ).execute()


def get_heartbeat_status(settings: Settings) -> dict:
    """Return freshness info for the health endpoint.

    Always returns a dict even when the DB is unreachable or the table is
    empty (last_run_at=None, is_stale=True, age_seconds=None).

    Fields:
        last_run_at          — ISO-8601 UTC string or None
        age_seconds          — seconds since last run, or None
        is_stale             — True if age > 6 h or last_run_at is None
        latest_cached_job_at — MAX(last_seen_at) from cached_jobs, or None
    """
    # --- heartbeat row ---
    last_run_at: Optional[str] = None
    age_seconds: Optional[float] = None
    is_stale = True

    try:
        sb = _client(settings)
        res = (
            sb.table("ingestion_heartbeat")
            .select("last_run_at")
            .eq("id", _SINGLETON_ID)
            .maybe_single()
            .execute()
        )
        row = res.data
        if row and row.get("last_run_at"):
            raw = row["last_run_at"]
            # Supabase returns ISO strings; parse to compute age.
            ts = _dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
            # Sentinel "never ran" value — treat as no run.
            if ts.year >= 2001:
                last_run_at = ts.isoformat()
                now = _dt.datetime.now(_dt.timezone.utc)
                age_seconds = (now - ts).total_seconds()
                is_stale = age_seconds > _STALE_THRESHOLD_SECONDS
    except Exception:
        pass  # DB unreachable — is_stale stays True, last_run_at stays None

    # --- latest cached job ---
    latest_cached_job_at: Optional[str] = None
    try:
        sb2 = _client(settings)
        cj_res = (
            sb2.table("cached_jobs")
            .select("last_seen_at")
            .order("last_seen_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = cj_res.data
        if rows:
            latest_cached_job_at = rows[0].get("last_seen_at")
    except Exception:
        pass

    return {
        "last_run_at": last_run_at,
        "age_seconds": round(age_seconds, 1) if age_seconds is not None else None,
        "is_stale": is_stale,
        "latest_cached_job_at": latest_cached_job_at,
    }
