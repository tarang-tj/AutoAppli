"""Contacts CRM routes — CRUD for recruiter/hiring manager contacts + interactions."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id
from app.models.schemas import ContactCreate, ContactUpdate, InteractionCreate
from app.repositories.user_session_memory import contacts as mem_contacts
from app.services.contacts_service import make_contact, add_interaction

router = APIRouter(tags=["contacts"])


@router.get("/contacts")
async def list_contacts(
    job_id: str | None = None,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    store = mem_contacts(user_id)
    if job_id:
        return [c for c in store if c["job_id"] == job_id]
    return list(reversed(store))


@router.post("/contacts", status_code=201)
async def create_contact(
    req: ContactCreate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    contact = make_contact(
        job_id=req.job_id,
        name=req.name,
        role=req.role,
        company=req.company,
        email=req.email,
        phone=req.phone,
        linkedin_url=req.linkedin_url,
        relationship=req.relationship,
        notes=req.notes,
        user_id=user_id,
    )
    mem_contacts(user_id).append(contact)
    return contact


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    req: ContactUpdate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_contacts(user_id)
    for contact in store:
        if contact["id"] == contact_id:
            updates = req.model_dump(exclude_unset=True)
            contact.update(updates)
            contact["updated_at"] = __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ).isoformat()
            return contact
    raise HTTPException(status_code=404, detail="Contact not found")


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_contacts(user_id)
    before = len(store)
    kept = [c for c in store if c["id"] != contact_id]
    if len(kept) == before:
        raise HTTPException(status_code=404, detail="Contact not found")
    store.clear()
    store.extend(kept)
    return {"ok": True}


# ── Interactions ──────────────────────────────────────────────────

@router.get("/contacts/{contact_id}/interactions")
async def list_interactions(
    contact_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_contacts(user_id)
    contact = next((c for c in store if c["id"] == contact_id), None)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact.get("interactions", [])


@router.post("/contacts/{contact_id}/interactions", status_code=201)
async def create_interaction(
    contact_id: str,
    req: InteractionCreate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_contacts(user_id)
    contact = next((c for c in store if c["id"] == contact_id), None)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    ix = add_interaction(
        contact_id=contact_id,
        interaction_type=req.interaction_type,
        summary=req.summary,
        occurred_at=req.occurred_at,
    )
    if "interactions" not in contact:
        contact["interactions"] = []
    contact["interactions"].append(ix)
    contact["last_contacted_at"] = ix["occurred_at"]
    return ix
