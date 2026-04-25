"""Story Library routes — CRUD for STAR-format interview stories."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id
from app.models.story_models import StoryCreate, StoryUpdate
from app.services import stories_service

router = APIRouter(tags=["stories"])


@router.get("/stories")
async def list_stories(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Return all stories for the authenticated user, newest first."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authorization required")
    return stories_service.list_stories(user_id, settings)


@router.post("/stories", status_code=201)
async def create_story(
    req: StoryCreate,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Create a new story and return the persisted row."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authorization required")
    return stories_service.create_story(
        user_id=user_id,
        title=req.title,
        tags=[str(t) for t in req.tags],
        situation=req.situation,
        task=req.task,
        action=req.action,
        result=req.result,
        settings=settings,
    )


@router.patch("/stories/{story_id}")
async def update_story(
    story_id: str,
    req: StoryUpdate,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Partially update a story. Only supplied fields are changed."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authorization required")
    updates = req.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields provided for update")
    # Coerce tags to plain strings for persistence layer.
    if "tags" in updates and updates["tags"] is not None:
        updates["tags"] = [str(t) for t in updates["tags"]]
    story = stories_service.update_story(story_id, user_id, updates, settings)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


@router.delete("/stories/{story_id}")
async def delete_story(
    story_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Delete a story. Returns 404 when the story does not exist or is not owned by the caller."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authorization required")
    deleted = stories_service.delete_story(story_id, user_id, settings)
    if not deleted:
        raise HTTPException(status_code=404, detail="Story not found")
    return {"ok": True}
