from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.utils.job_url import normalize_job_url

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


def sorted_jobs(jobs: list[dict]) -> list[dict]:
    return sorted(
        jobs,
        key=lambda j: (
            _rank(j["status"]),
            j.get("sort_order", 0),
            j.get("created_at", ""),
        ),
    )


def create_job(company: str, title: str, url: str | None, description: str | None, source: str) -> dict:
    job_id = f"job-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    sort_order = _next_sort_order("bookmarked")
    job = {
        "id": job_id,
        "company": company,
        "title": title,
        "url": normalize_job_url(url),
        "description": description,
        "status": "bookmarked",
        "source": source,
        "sort_order": sort_order,
        "created_at": now,
        "updated_at": now,
    }
    _jobs[job_id] = job
    return job


def list_jobs(status: str | None) -> list[dict]:
    jobs = list(_jobs.values())
    if status:
        jobs = [j for j in jobs if j["status"] == status]
    return sorted_jobs(jobs)


def reorder_jobs(status: str, ordered_ids: list[str]) -> None:
    now = datetime.now(timezone.utc).isoformat()
    for i, jid in enumerate(ordered_ids):
        if jid not in _jobs:
            raise KeyError(f"Unknown job id: {jid}")
        if _jobs[jid]["status"] != status:
            raise ValueError(f"Job {jid} is not in column {status}")
        _jobs[jid]["sort_order"] = i
        _jobs[jid]["updated_at"] = now


def patch_job(job_id: str, patch: dict) -> dict:
    if job_id not in _jobs:
        raise KeyError("not found")
    row = _jobs[job_id]
    now = datetime.now(timezone.utc).isoformat()
    if "status" in patch and patch["status"] is not None:
        new_status = patch["status"]
        if row["status"] != new_status:
            row["status"] = new_status
            row["sort_order"] = _next_sort_order(new_status)
    if "notes" in patch:
        n = patch["notes"]
        row["notes"] = None if n in ("", None) else n
    row["updated_at"] = now
    return row


def delete_job(job_id: str) -> None:
    if job_id not in _jobs:
        raise KeyError("not found")
    del _jobs[job_id]
