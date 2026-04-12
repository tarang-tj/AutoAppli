"""Application Timeline routes — per-job activity feed + manual event CRUD."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id
from app.models.schemas import TimelineEventCreate
from app.repositories.user_session_memory import (
    contacts as mem_contacts,
    interview_notes as mem_interviews,
    outreach_messages as mem_outreach,
    timeline_events as mem_timeline,
)
from app.services.timeline_service import build_job_timeline, make_timeline_event

router = APIRouter(tags=["timeline"])


@router.get("/timeline/{job_id}")
async def get_job_timeline(
    job_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Build full timeline for a specific job by aggregating all activity sources."""
    # Get job from memory store — fall back to stub if not found
    from app.repositories.user_session_memory import job_store
    jobs_dict = job_store(user_id)
    job = jobs_dict.get(job_id)
    if not job:
        # Try to build a minimal job dict
        job = {"id": job_id, "status": "bookmarked", "created_at": "", "company": "", "title": ""}

    interviews = list(mem_interviews(user_id))
    outreach = list(mem_outreach(user_id))
    contacts = list(mem_contacts(user_id))
    manual = list(mem_timeline(user_id))

    return build_job_timeline(job, interviews, outreach, contacts, manual)


@router.post("/timeline", status_code=201)
async def create_timeline_event(
    req: TimelineEventCreate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    evt = make_timeline_event(
        job_id=req.job_id,
        event_type=req.event_type,
        title=req.title,
        description=req.description,
        occurred_at=req.occurred_at,
        user_id=user_id,
    )
    mem_timeline(user_id).append(evt)
    return evt


@router.delete("/timeline/{event_id}")
async def delete_timeline_event(
    event_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_timeline(user_id)
    before = len(store)
    kept = [e for e in store if e["id"] != event_id]
    if len(kept) == before:
        raise HTTPException(status_code=404, detail="Timeline event not found")
    store.clear()
    store.extend(kept)
    return {"ok": True}
