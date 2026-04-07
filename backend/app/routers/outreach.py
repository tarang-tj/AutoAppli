from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.models.schemas import OutreachGenerateRequest, OutreachGenerateResponse
from app.repositories import outreach_supabase as outreach_sb
from app.repositories.user_session_memory import outreach_messages
from app.services.outreach_service import generate_outreach

router = APIRouter(tags=["outreach"])


def _outreach_db(settings: Settings, user_id: str | None) -> bool:
    return bool(jobs_use_supabase(settings) and user_id)


@router.post("/outreach/generate", response_model=OutreachGenerateResponse)
async def create_outreach(
    req: OutreachGenerateRequest,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
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
            applicant_name=req.applicant_name,
        )
        if _outreach_db(settings, user_id):
            assert user_id is not None
            try:
                saved = outreach_sb.insert_message(
                    settings,
                    user_id,
                    message_type=result["message_type"],
                    recipient_name=result["recipient_name"],
                    recipient_role=result.get("recipient_role"),
                    subject=result.get("subject"),
                    body=result["body"],
                )
                return OutreachGenerateResponse(**saved)
            except RuntimeError as exc:
                raise HTTPException(status_code=500, detail=str(exc)) from exc
        outreach_messages(user_id).append(result)
        return OutreachGenerateResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/outreach")
async def list_outreach(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    if _outreach_db(settings, user_id):
        return outreach_sb.list_messages(settings, user_id)
    msgs = outreach_messages(user_id)
    return list(reversed(msgs))
