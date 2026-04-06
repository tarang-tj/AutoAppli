from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.utils.job_url import normalize_job_url

router = APIRouter(tags=["jobs"])

_jobs: dict[str, dict] = {}


class JobCreate(BaseModel):
    company: str
    title: str
    url: str | None = None
    description: str | None = None


class JobStatusUpdate(BaseModel):
    status: str


@router.post("/jobs")
async def create_job(body: JobCreate):
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    job = {
        "id": job_id,
        "company": body.company,
        "title": body.title,
        "url": normalize_job_url(body.url),
        "description": body.description,
        "status": "bookmarked",
        "source": "manual",
        "created_at": now,
        "updated_at": now,
    }
    _jobs[job_id] = job
    return job


@router.get("/jobs")
async def list_jobs(status: str | None = None):
    jobs = list(_jobs.values())
    if status:
        jobs = [j for j in jobs if j["status"] == status]
    return jobs


@router.patch("/jobs/{job_id}")
async def update_job_status(job_id: str, body: JobStatusUpdate):
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    _jobs[job_id]["status"] = body.status
    _jobs[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
    return _jobs[job_id]


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    del _jobs[job_id]
    return {"ok": True}
