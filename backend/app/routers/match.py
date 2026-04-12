"""Match router — compute resume-job fit scores."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.repositories import jobs_supabase as jobs_sb
from app.repositories import jobs_memory
from app.services.match_service import compute_batch_match_scores

router = APIRouter(tags=["match"])


def _all_jobs(settings: Settings, user_id: str | None) -> list[dict]:
    if jobs_use_supabase(settings) and user_id:
        return jobs_sb.list_jobs(settings, user_id, status=None)
    return jobs_memory.list_jobs(status=None)


@router.post("/match/scores")
async def get_match_scores(
    body: dict,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Compute match scores for all jobs against the provided resume text.

    Body: { "resume_text": "..." }
    Returns: { "scores": { job_id: { score, matched_keywords, missing_keywords } } }
    """
    resume_text = body.get("resume_text", "")
    jobs = _all_jobs(settings, user_id)
    scores = compute_batch_match_scores(resume_text, jobs)
    return {"scores": scores}
