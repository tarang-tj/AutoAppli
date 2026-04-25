"""Match router — compute resume-job fit scores.

Uses the structured match_v2 scorer (skills + title + seniority + location
+ remote + recency + salary) when a user profile is available and the
job has enough structured fields; otherwise falls back to the legacy
keyword-only scorer so pre-profile users still see a number.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request, Response

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.middleware.rate_limit import limiter
from app.repositories import jobs_memory, jobs_supabase as jobs_sb, profile_supabase
from app.services.match_service import compute_batch_match_scores
from app.services.match_v2 import (
    CandidateProfile,
    JobProfile,
    RemoteType,
    extract_skills,
    result_to_dict,
    score_match,
)

router = APIRouter(tags=["match"])


def _all_jobs(settings: Settings, user_id: str | None) -> list[dict]:
    if jobs_use_supabase(settings) and user_id:
        return jobs_sb.list_jobs(settings, user_id, status=None)
    return jobs_memory.list_jobs(status=None)


def _get_profile(settings: Settings, user_id: str | None) -> dict:
    if jobs_use_supabase(settings) and user_id:
        try:
            return profile_supabase.get_profile(settings, user_id)
        except Exception:
            return {}
    return {}


def _coerce_remote(value: Any) -> RemoteType | None:
    if value in ("remote", "hybrid", "onsite"):
        return value
    return None


def _build_job_profile(job: dict) -> JobProfile:
    """Coerce a jobs-row dict into a JobProfile for match_v2."""
    return JobProfile(
        id=str(job.get("id") or ""),
        title=str(job.get("title") or ""),
        description=str(job.get("description") or ""),
        company=job.get("company") or None,
        location=job.get("location") or None,
        skills=list(job.get("skills") or []),
        seniority=None,
        remote_type=_coerce_remote(job.get("work_model")),
        salary_min=job.get("salary_min") if isinstance(job.get("salary_min"), int) else None,
        salary_max=job.get("salary_max") if isinstance(job.get("salary_max"), int) else None,
        posted_at=job.get("posted_at") or job.get("created_at") or None,
    )


def _build_candidate_profile(resume_text: str, profile: dict) -> CandidateProfile:
    cand_skills = extract_skills(resume_text)
    return CandidateProfile(
        skills=cand_skills,
        title=profile.get("headline") or None,
        seniority=None,
        years_of_experience=0,
        location=profile.get("location") or None,
        remote_preference=_coerce_remote(profile.get("remote_preference")),
        salary_target=None,
        resume_text=resume_text,
    )


@router.post("/match/scores")
@limiter.limit("60/minute")
async def get_match_scores(
    request: Request,
    response: Response,  # required by slowapi to inject rate-limit headers
    body: dict,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Compute match scores for all jobs against the provided resume text.

    Body: { "resume_text": "...", "use_v2": optional bool (default True) }
    Returns (v2):
        { "scores": { job_id: { score, score_exact, breakdown, matched_skills,
                                missing_skills, extra_skills, headline } },
          "engine": "v2" }
    Returns (legacy fallback):
        { "scores": { job_id: { score, matched_keywords, missing_keywords,
                                top_job_keywords } },
          "engine": "legacy" }
    """
    resume_text = str(body.get("resume_text") or "")
    use_v2 = body.get("use_v2", True)
    jobs = _all_jobs(settings, user_id)

    if not use_v2:
        return {
            "scores": compute_batch_match_scores(resume_text, jobs),
            "engine": "legacy",
        }

    profile = _get_profile(settings, user_id)
    candidate = _build_candidate_profile(resume_text, profile)

    scores: dict[str, dict] = {}
    for job in jobs:
        jp = _build_job_profile(job)
        if not jp.id:
            continue
        try:
            result = score_match(jp, candidate)
            scores[jp.id] = result_to_dict(result)
        except Exception:
            # Fall back to legacy score for this single job so a bad row
            # doesn't blow up the whole dashboard.
            legacy = compute_batch_match_scores(resume_text, [job])
            scores[jp.id] = legacy.get(jp.id, {"score": 0})

    return {"scores": scores, "engine": "v2"}
