"""Notification & reminder routes — smart auto-reminders + custom CRUD."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.models.schemas import ReminderCreate, ReminderUpdate
from app.repositories.user_session_memory import (
    interview_notes as mem_interviews,
    reminders as mem_reminders,
)
from app.services.notification_service import generate_auto_reminders, make_reminder

router = APIRouter(tags=["notifications"])


# ── Smart auto-reminders ──────────────────────────────────────────

@router.get("/notifications/reminders")
async def list_reminders(
    include_auto: bool = True,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Return manual + auto-generated reminders. Auto reminders scan jobs & interviews."""
    manual = list(mem_reminders(user_id))

    if not include_auto:
        return manual

    # Fetch jobs from memory (import here to avoid circular)
    from app.repositories.user_session_memory import job_store
    jobs = list(job_store(user_id).values()) if hasattr(job_store(user_id), "values") else []
    interviews = list(mem_interviews(user_id))

    auto = generate_auto_reminders(jobs, interviews)
    return auto + manual


# ── CRUD for custom reminders ─────────────────────────────────────

@router.post("/notifications/reminders", status_code=201)
async def create_reminder(
    req: ReminderCreate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    reminder = make_reminder(
        job_id=req.job_id,
        reminder_type=req.reminder_type,
        title=req.title,
        message=req.message,
        due_at=req.due_at,
        user_id=user_id,
    )
    mem_reminders(user_id).append(reminder)
    return reminder


@router.patch("/notifications/reminders/{reminder_id}")
async def update_reminder(
    reminder_id: str,
    req: ReminderUpdate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_reminders(user_id)
    for rem in store:
        if rem["id"] == reminder_id:
            updates = req.model_dump(exclude_unset=True)
            rem.update(updates)
            return rem
    raise HTTPException(status_code=404, detail="Reminder not found")


@router.delete("/notifications/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_reminders(user_id)
    before = len(store)
    kept = [r for r in store if r["id"] != reminder_id]
    if len(kept) == before:
        raise HTTPException(status_code=404, detail="Reminder not found")
    store.clear()
    store.extend(kept)
    return {"ok": True}


# ── Read/dismiss ──────────────────────────────────────────────────

@router.post("/notifications/reminders/{reminder_id}/read")
async def mark_read(
    reminder_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_reminders(user_id)
    for rem in store:
        if rem["id"] == reminder_id:
            rem["is_read"] = True
            return rem
    raise HTTPException(status_code=404, detail="Reminder not found")


@router.post("/notifications/reminders/{reminder_id}/dismiss")
async def dismiss_reminder(
    reminder_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_reminders(user_id)
    for rem in store:
        if rem["id"] == reminder_id:
            rem["is_dismissed"] = True
            return rem
    raise HTTPException(status_code=404, detail="Reminder not found")
