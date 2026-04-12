"""Salary & compensation routes — CRUD + comparison."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id
from app.models.schemas import CompensationCreate, CompensationUpdate
from app.repositories.user_session_memory import compensations as mem_compensations
from app.services.salary_service import compare_offers, make_compensation

router = APIRouter(tags=["salary"])


@router.get("/salary")
async def list_compensations(
    job_id: str | None = None,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    store = mem_compensations(user_id)
    if job_id:
        return [c for c in store if c["job_id"] == job_id]
    return list(reversed(store))


@router.post("/salary", status_code=201)
async def create_compensation(
    req: CompensationCreate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    entry = make_compensation(
        job_id=req.job_id,
        base_salary=req.base_salary,
        bonus=req.bonus,
        equity_value=req.equity_value,
        signing_bonus=req.signing_bonus,
        benefits_value=req.benefits_value,
        currency=req.currency,
        pay_period=req.pay_period,
        notes=req.notes,
        user_id=user_id,
    )
    mem_compensations(user_id).append(entry)
    return entry


@router.patch("/salary/{comp_id}")
async def update_compensation(
    comp_id: str,
    req: CompensationUpdate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_compensations(user_id)
    for entry in store:
        if entry["id"] == comp_id:
            updates = req.model_dump(exclude_unset=True)
            # Recalculate total
            entry.update(updates)
            entry["total_compensation"] = (
                entry.get("base_salary", 0)
                + entry.get("bonus", 0)
                + entry.get("equity_value", 0)
                + entry.get("signing_bonus", 0)
                + entry.get("benefits_value", 0)
            )
            return entry
    raise HTTPException(status_code=404, detail="Compensation entry not found")


@router.delete("/salary/{comp_id}")
async def delete_compensation(
    comp_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = mem_compensations(user_id)
    before = len(store)
    kept = [c for c in store if c["id"] != comp_id]
    if len(kept) == before:
        raise HTTPException(status_code=404, detail="Compensation entry not found")
    store.clear()
    store.extend(kept)
    return {"ok": True}


@router.get("/salary/compare")
async def compare_compensations(
    user_id: str | None = Depends(get_jobs_user_id),
):
    """Compare all tracked compensation packages side-by-side."""
    store = mem_compensations(user_id)
    return compare_offers(list(store))
