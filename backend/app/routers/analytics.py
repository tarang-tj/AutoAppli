"""Analytics router — pipeline funnel, conversion rates, stage durations."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.repositories import jobs_supabase as jobs_sb
from app.repositories import jobs_memory
from app.services.analytics_service import compute_analytics

router = APIRouter(tags=["analytics"])


def _all_jobs(settings: Settings, user_id: str | None) -> list[dict]:
    """Retrieve all jobs for the user regardless of storage backend."""
    if jobs_use_supabase(settings) and user_id:
        return jobs_sb.list_jobs(settings, user_id, status=None)
    return jobs_memory.list_jobs(status=None)


@router.get("/analytics")
async def get_analytics(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    jobs = _all_jobs(settings, user_id)
    return compute_analytics(jobs)
