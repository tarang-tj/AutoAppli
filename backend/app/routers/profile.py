from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.models.schemas import ProfilePatch, ProfileResponse
from app.repositories import profile_supabase as profile_sb

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    if not jobs_use_supabase(settings):
        return ProfileResponse()
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authorization required")
    return ProfileResponse(**profile_sb.get_profile(settings, user_id))


@router.patch("/profile", response_model=ProfileResponse)
async def patch_profile(
    body: ProfilePatch,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    if not jobs_use_supabase(settings):
        return ProfileResponse(
            display_name=(body.display_name or "").strip()[:200],
            headline=(body.headline or "").strip()[:300],
            linkedin_url=(body.linkedin_url or "").strip()[:500],
            updated_at=None,
        )
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authorization required")
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return ProfileResponse(**profile_sb.get_profile(settings, user_id))
    try:
        return ProfileResponse(**profile_sb.patch_profile(settings, user_id, patch))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
