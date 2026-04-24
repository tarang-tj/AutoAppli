from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.config import get_settings
from app.deps.jobs_auth import get_optional_user_id, jobs_use_supabase
from app.middleware.rate_limit import limiter
from app.models.schemas import JobSearchResult, SearchRequest
from app.repositories import search_supabase
from app.services import live_search_service

router = APIRouter(tags=["search"])
logger = logging.getLogger(__name__)


def _result_payload(r: JobSearchResult) -> dict:
    d = r.model_dump()
    d["snippet"] = d.pop("description_snippet") or ""
    return d


@router.post("/search")
@limiter.limit("20/minute")
async def search_jobs(
    request: Request,
    req: SearchRequest,
    user_id: str | None = Depends(get_optional_user_id),
):
    settings = get_settings()
    results = await live_search_service.live_search(
        settings,
        query=req.query,
        location=req.location or None,
        remote_only=req.remote_only,
        page=req.page,
        per_page=req.per_page,
    )
    search_id: str | None = None
    persisted = False
    if jobs_use_supabase(settings) and user_id:
        sid = search_supabase.persist_search_run(settings, user_id, req, results)
        if sid:
            search_id = sid
            persisted = True

    return {
        "results": [_result_payload(r) for r in results],
        "search_id": search_id,
        "persisted": persisted,
    }


@router.get("/search/history")
async def search_history(
    limit: int = Query(15, ge=1, le=50),
    user_id: str | None = Depends(get_optional_user_id),
):
    settings = get_settings()
    if not jobs_use_supabase(settings) or not user_id:
        return []
    return search_supabase.list_search_history(settings, user_id, limit)


@router.get("/search/runs/{search_id}/results")
async def get_cached_search_results(
    search_id: str,
    user_id: str | None = Depends(get_optional_user_id),
):
    """Load listing rows stored for a previous search (no live scrape)."""
    settings = get_settings()
    if not jobs_use_supabase(settings) or not user_id:
        raise HTTPException(status_code=404, detail="Not found")
    rows = search_supabase.get_saved_results_for_run(settings, user_id, search_id)
    if rows is None:
        raise HTTPException(status_code=404, detail="Search not found")
    return {
        "results": rows,
        "search_id": search_id,
        "from_cache": True,
        "persisted": False,
    }
