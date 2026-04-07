from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.utils.job_url import normalize_job_url

router = APIRouter(tags=["jobs"])

_jobs: dict[str, dict] = {}

STATUS_RANK: tuple[str, ...] = (
    "bookmarked",
    "applied",
    "interviewing",
    "offer",
    "rejected",
    "ghosted",
)


def _rank(status: str) -> int:
    try:
        return STATUS_RANK.index(status)
    except ValueError:
        return 0


def _next_sort_order(status: str) -> int:
    orders = [j["sort_order"] for j in _jobs.values() if j["status"] == status]
    return (max(orders) if orders else -1) + 1


def _sorted_jobs(jobs: list[dict]) -> list[dict]:
    return sorted(
        jobs,
        key=lambda j: (
            _rank(j["status"]),
            j.get("sort_order", 0),
            j.get("created_at", ""),
        ),
    )


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


class JobStatusUpdate(BaseModel):
    status: JobStatus


class ReorderJobsBody(BaseModel):
    status: JobStatus
    ordered_ids: list[str]


@router.post("/jobs")
async def create_job(body: JobCreate):
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    sort_order = _next_sort_order("bookmarked")
    job = {
        "id": job_id,
        "company": body.company,
        "title": body.title,
        "url": normalize_job_url(body.url),
        "description": body.description,
        "status": "bookmarked",
        "source": "manual",
        "sort_order": sort_order,
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
    return _sorted_jobs(jobs)


@router.put("/jobs/reorder")
async def reorder_jobs(body: ReorderJobsBody):
    now = datetime.now(timezone.utc).isoformat()
    for i, jid in enumerate(body.ordered_ids):
        if jid not in _jobs:
            raise HTTPException(status_code=400, detail=f"Unknown job id: {jid}")
        if _jobs[jid]["status"] != body.status:
            raise HTTPException(
                status_code=400,
                detail=f"Job {jid} is not in column {body.status}",
            )
        _jobs[jid]["sort_order"] = i
        _jobs[jid]["updated_at"] = now
    return {"ok": True}


@router.patch("/jobs/{job_id}")
async def update_job_status(job_id: str, body: JobStatusUpdate):
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    row = _jobs[job_id]
    if row["status"] != body.status:
        row["status"] = body.status
        row["sort_order"] = _next_sort_order(body.status)
    row["updated_at"] = datetime.now(timezone.utc).isoformat()
    return row


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    del _jobs[job_id]
    return {"ok": True}
