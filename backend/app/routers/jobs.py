from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.repositories import jobs_memory, jobs_supabase

router = APIRouter(tags=["jobs"])

JobStatus = Literal[
    "bookmarked",
    "applied",
    "interviewing",
    "offer",
    "rejected",
    "ghosted",
]


class JobCreate(BaseModel):
    company: str
    title: str
    url: str | None = None
    description: str | None = None
    source: str = "manual"


class JobPatch(BaseModel):
    status: JobStatus | None = Field(default=None, description="Kanban column")
    notes: str | None = Field(default=None, description="Private notes (empty string clears)")


class ReorderJobsBody(BaseModel):
    status: JobStatus
    ordered_ids: list[str]


def _persisted(settings) -> bool:
    return jobs_use_supabase(settings)


@router.post("/jobs")
async def create_job(
    body: JobCreate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    settings = get_settings()
    if _persisted(settings):
        if user_id is None:
            raise HTTPException(status_code=401, detail="Authorization required")
        try:
            return jobs_supabase.create_job(
                settings,
                user_id,
                body.company,
                body.title,
                body.url,
                body.description,
                body.source,
            )
        except RuntimeError as e:
            raise HTTPException(status_code=500, detail=str(e)) from e
    return jobs_memory.create_job(
        body.company,
        body.title,
        body.url,
        body.description,
        body.source,
    )


@router.get("/jobs")
async def list_jobs(
    status: str | None = None,
    user_id: str | None = Depends(get_jobs_user_id),
):
    settings = get_settings()
    if _persisted(settings):
        if user_id is None:
            raise HTTPException(status_code=401, detail="Authorization required")
        return jobs_supabase.list_jobs(settings, user_id, status)
    return jobs_memory.list_jobs(status)


@router.put("/jobs/reorder")
async def reorder_jobs(
    body: ReorderJobsBody,
    user_id: str | None = Depends(get_jobs_user_id),
):
    settings = get_settings()
    if _persisted(settings):
        if user_id is None:
            raise HTTPException(status_code=401, detail="Authorization required")
        try:
            jobs_supabase.reorder_jobs(settings, user_id, body.status, body.ordered_ids)
        except KeyError as e:
            raise HTTPException(status_code=400, detail=str(e) or e.args[0]) from e
        return {"ok": True}
    try:
        jobs_memory.reorder_jobs(body.status, body.ordered_ids)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e) or e.args[0]) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"ok": True}


@router.patch("/jobs/{job_id}")
async def patch_job(
    job_id: str,
    body: JobPatch,
    user_id: str | None = Depends(get_jobs_user_id),
):
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one of: status, notes",
        )
    settings = get_settings()
    if _persisted(settings):
        if user_id is None:
            raise HTTPException(status_code=401, detail="Authorization required")
        try:
            return jobs_supabase.patch_job(settings, user_id, job_id, patch)
        except KeyError:
            raise HTTPException(status_code=404, detail="Job not found") from None
    try:
        return jobs_memory.patch_job(job_id, patch)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found") from None


@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    settings = get_settings()
    if _persisted(settings):
        if user_id is None:
            raise HTTPException(status_code=401, detail="Authorization required")
        try:
            jobs_supabase.delete_job(settings, user_id, job_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Job not found") from None
        return {"ok": True}
    try:
        jobs_memory.delete_job(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found") from None
    return {"ok": True}
