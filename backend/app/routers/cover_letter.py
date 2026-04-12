from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps.jobs_auth import get_jobs_user_id
from app.models.schemas import CoverLetterRequest
from app.repositories.user_session_memory import cover_letters
from app.services.cover_letter_service import generate_cover_letter

router = APIRouter(tags=["cover_letter"])


@router.post("/cover-letter/generate")
async def generate_cover_letter_endpoint(
    req: CoverLetterRequest,
    user_id: str = Depends(get_jobs_user_id),
):
    """Generate a personalized cover letter."""
    try:
        result = await generate_cover_letter(
            job_title=req.job_title,
            company=req.company,
            job_description=req.job_description,
            resume_text=req.resume_text,
            tone=req.tone,
            instructions=req.instructions,
        )

        # Store in session memory
        store = cover_letters(user_id)
        store.append(result)

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/cover-letter/history")
async def list_cover_letter_history(
    user_id: str = Depends(get_jobs_user_id),
):
    """Get previously generated cover letters."""
    store = cover_letters(user_id)
    return store


@router.delete("/cover-letter/{cl_id}")
async def delete_cover_letter(
    cl_id: str,
    user_id: str = Depends(get_jobs_user_id),
):
    """Delete a previously generated cover letter."""
    store = cover_letters(user_id)

    # Find and remove
    for i, cl in enumerate(store):
        if cl.get("id") == cl_id:
            store.pop(i)
            return {"status": "ok", "message": "Cover letter deleted"}

    raise HTTPException(status_code=404, detail="Cover letter not found")
