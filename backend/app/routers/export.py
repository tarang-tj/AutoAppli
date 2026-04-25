"""Export router — CSV, JSON downloads and summary reports."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse, Response

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.repositories import jobs_supabase as jobs_sb
from app.repositories import jobs_memory
from app.services.export_service import (
    export_jobs_csv,
    export_jobs_json,
    generate_summary_report,
)
from app.services.ical_service import build_deadlines_ical

router = APIRouter(tags=["export"])


def _all_jobs(settings: Settings, user_id: str | None) -> list[dict]:
    """Retrieve all jobs for the user regardless of storage backend."""
    if jobs_use_supabase(settings) and user_id:
        return jobs_sb.list_jobs(settings, user_id, status=None)
    return jobs_memory.list_jobs(status=None)


@router.get("/export/csv")
async def export_csv(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Export all jobs as CSV."""
    jobs = _all_jobs(settings, user_id)
    csv_content = export_jobs_csv(jobs)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobs.csv"},
    )


@router.get("/export/json")
async def export_json(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Export all jobs as JSON."""
    jobs = _all_jobs(settings, user_id)
    json_content = export_jobs_json(jobs)
    return Response(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=jobs.json"},
    )


@router.get("/export/report")
async def export_report(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Export summary report as JSON."""
    jobs = _all_jobs(settings, user_id)
    report = generate_summary_report(jobs)
    return report


@router.get("/export/deadlines.ics", response_class=PlainTextResponse)
async def export_deadlines_ics(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Export saved-job deadlines as an RFC 5545 iCalendar feed.

    Each job with a ``deadline`` (or legacy ``closing_date``) becomes an
    all-day VEVENT. Jobs without a deadline are skipped silently. The
    response is suitable for both one-time download and ``webcal://``
    subscription — calendar apps will re-fetch periodically.
    """
    jobs = _all_jobs(settings, user_id)
    body = build_deadlines_ical(jobs, calendar_name="AutoAppli — Deadlines")
    return PlainTextResponse(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="autoappli-deadlines.ics"',
            "Cache-Control": "private, no-cache",
        },
    )
