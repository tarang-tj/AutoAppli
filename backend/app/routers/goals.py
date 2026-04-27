"""Goal Config routes — GET and PATCH for the user's weekly application target."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id
from app.models.goal_models import GoalConfigPatch
from app.services import goals_service

router = APIRouter(tags=["goals"])


@router.get("/goals")
async def get_goal_config(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Return current user's goal config; creates a default row on first call."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authorization required")
    return goals_service.get_or_create(user_id, settings)


@router.patch("/goals")
async def patch_goal_config(
    req: GoalConfigPatch,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Partially update goal config. Only supplied fields are changed."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authorization required")
    updates = req.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields provided for update")
    # Coerce date to string for persistence layer.
    if "start_date" in updates and updates["start_date"] is not None:
        updates["start_date"] = str(updates["start_date"])
    return goals_service.patch(user_id, updates, settings)
