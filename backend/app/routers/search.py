from fastapi import APIRouter

from app.models.schemas import SearchRequest
from app.services import scraper_service

router = APIRouter(tags=["search"])


@router.post("/search")
async def search_jobs(req: SearchRequest):
    results = await scraper_service.search_jobs(
        query=req.query,
        location=req.location or None,
        remote_only=req.remote_only,
        page=req.page,
        per_page=req.per_page,
    )
    return {
        "results": [r.model_dump() for r in results],
        "message": None,
    }
