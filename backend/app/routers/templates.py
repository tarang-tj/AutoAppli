"""Document templates routes — CRUD for resume and cover letter templates."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id
from app.models.schemas import TemplateCreate, TemplateUpdate, TemplateRenderRequest
from app.repositories import user_session_memory as mem
from app.services.templates_service import make_template, render_template

router = APIRouter(tags=["templates"])


@router.get("/templates")
async def list_templates(
    template_type: str | None = None,
    category: str | None = None,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """List all templates with optional filters."""
    store = mem.templates(user_id)
    results = list(store)

    # Filter by template_type if provided
    if template_type:
        results = [t for t in results if t.get("template_type") == template_type]

    # Filter by category if provided
    if category:
        results = [t for t in results if t.get("category") == category]

    return list(reversed(results))


@router.post("/templates", status_code=201)
async def create_template(
    req: TemplateCreate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    """Create a new template."""
    template = make_template(
        user_id=user_id,
        name=req.name,
        template_type=req.template_type,
        content=req.content,
        category=req.category,
        is_default=req.is_default,
    )
    mem.templates(user_id).append(template)
    return template


@router.patch("/templates/{template_id}")
async def update_template(
    template_id: str,
    req: TemplateUpdate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    """Update template fields."""
    store = mem.templates(user_id)
    for template in store:
        if template["id"] == template_id:
            updates = req.model_dump(exclude_unset=True)
            template.update(updates)
            template["updated_at"] = __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ).isoformat()
            return template
    raise HTTPException(status_code=404, detail="Template not found")


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    """Delete a template."""
    store = mem.templates(user_id)
    before = len(store)
    kept = [t for t in store if t["id"] != template_id]
    if len(kept) == before:
        raise HTTPException(status_code=404, detail="Template not found")
    store.clear()
    store.extend(kept)
    return {"ok": True}


@router.post("/templates/{template_id}/render")
async def render_template_endpoint(
    template_id: str,
    req: TemplateRenderRequest,
    user_id: str | None = Depends(get_jobs_user_id),
):
    """Render a template with provided variables."""
    store = mem.templates(user_id)
    template = next((t for t in store if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    rendered_content = render_template(template, req.variables)
    return {
        "template_id": template_id,
        "rendered_content": rendered_content,
    }
