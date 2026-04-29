"""
Health endpoints for infrastructure observability.

GET /api/v1/health/ingestion
    Returns ingestion cron freshness: last run timestamp, age, staleness flag,
    and the newest cached_job row's last_seen_at.
    No auth required — this is a public observability surface.
    is_stale = True when last_run_at is absent OR age > 6 hours.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.config import get_settings
from app.repositories import ingestion_heartbeat_supabase

router = APIRouter(tags=["health"])


@router.get("/health/ingestion")
async def ingestion_health() -> dict:
    """Return ingestion cron freshness status.

    Response shape:
        last_run_at          — ISO-8601 UTC string or null
        age_seconds          — float seconds since last run, or null
        is_stale             — bool; true if last run > 6 h ago or never ran
        latest_cached_job_at — ISO-8601 UTC string of newest cached_jobs row, or null
    """
    settings = get_settings()
    return ingestion_heartbeat_supabase.get_heartbeat_status(settings)
