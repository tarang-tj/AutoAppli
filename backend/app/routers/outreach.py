from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.deps.jobs_auth import get_jobs_user_id
from app.models.schemas import OutreachGenerateRequest, OutreachGenerateResponse
from app.repositories.user_session_memory import outreach_messages
from app.services.outreach_service import generate_outreach

router = APIRouter(tags=["outreach"])


@router.post("/outreach/generate", response_model=OutreachGenerateResponse)
async def create_outreach(
    req: OutreachGenerateRequest,
    user_id: str | None = Depends(get_jobs_user_id),
):
    try:
        result = await generate_outreach(
            message_type=req.message_type,
            recipient_name=req.recipient_name,
            recipient_role=req.recipient_role,
            job_title=req.job_title,
            company=req.company,
            resume_summary=req.resume_text,
            extra_context=req.job_description,
        )
        outreach_messages(user_id).append(result)
        return OutreachGenerateResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/outreach")
async def list_outreach(user_id: str | None = Depends(get_jobs_user_id)):
    msgs = outreach_messages(user_id)
    return list(reversed(msgs))
