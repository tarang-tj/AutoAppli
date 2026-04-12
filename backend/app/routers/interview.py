"""Interview prep & notes routes — CRUD + AI-generated prep material."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.models.schemas import (
    InterviewNoteCreate,
    InterviewNoteUpdate,
    InterviewPrepRequest,
)
from app.repositories.user_session_memory import interview_notes as mem_interviews
from app.services.interview_service import generate_interview_prep, make_interview_note

router = APIRouter(tags=["interviews"])


# ── helpers ────────────────────────────────────────────────────────

def _use_db(settings: Settings, user_id: str | None) -> bool:
    return bool(jobs_use_supabase(settings) and user_id)


# ── AI prep ────────────────────────────────────────────────────────

@router.post("/interviews/prep")
async def create_prep(
    req: InterviewPrepRequest,
    user_id: str | None = Depends(get_jobs_user_id),
):
    try:
        prep = await generate_interview_prep(
            job_title=req.job_title,
            company=req.company,
            job_description=req.job_description,
            resume_text=req.resume_text,
        )
        return {"prep": prep}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


# ── CRUD ───────────────────────────────────────────────────────────

@router.get("/interviews")
async def list_interviews(
    job_id: str | None = None,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    store = mem_interviews(user_id)
    if job_id:
        return [n for n in store if n["job_id"] == job_id]
    return list(reversed(store))


@router.post("/interviews", status_code=201)
async def create_interview(
    req: InterviewNoteCreate,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    note = make_interview_note(
        job_id=req.job_id,
        round_name=req.round_name,
        scheduled_at=req.scheduled_at,
        interviewer_name=req.interviewer_name,
        notes=req.notes,
        prep_material=req.prep_material,
        user_id=user_id,
    )
    mem_interviews(user_id).append(note)
    return note


@router.patch("/interviews/{note_id}")
async def update_interview(
    note_id: str,
    req: InterviewNoteUpdate,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    store = mem_interviews(user_id)
    for note in store:
        if note["id"] == note_id:
            updates = req.model_dump(exclude_unset=True)
            note.update(updates)
            return note
    raise HTTPException(status_code=404, detail="Interview note not found")


@router.delete("/interviews/{note_id}")
async def delete_interview(
    note_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    store = mem_interviews(user_id)
    before = len(store)
    kept = [n for n in store if n["id"] != note_id]
    if len(kept) == before:
        raise HTTPException(status_code=404, detail="Interview note not found")
    store.clear()
    store.extend(kept)
    return {"ok": True}
