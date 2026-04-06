from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import OutreachGenerateRequest, OutreachGenerateResponse
from app.services.outreach_service import generate_outreach

router = APIRouter(tags=["outreach"])

_messages: list[dict] = []


@router.post("/outreach/generate", response_model=OutreachGenerateResponse)
async def create_outreach(req: OutreachGenerateRequest):
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
        _messages.append(result)
        return OutreachGenerateResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/outreach")
async def list_outreach():
    return _messages
