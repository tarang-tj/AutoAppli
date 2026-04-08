from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.models.schemas import (
    OutreachGenerateRequest,
    OutreachGenerateResponse,
    ThankYouRequest,
    ThankYouResponse,
)
from app.repositories import jobs_supabase, outreach_supabase as outreach_sb
from app.repositories.user_session_memory import outreach_messages
from app.services.outreach_service import generate_outreach, generate_thank_you

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


@router.post("/outreach/thank-you", response_model=ThankYouResponse)
async def create_thank_you(
    req: ThankYouRequest,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    title = req.job_title.strip()
    company = req.company.strip()
    if req.job_id and jobs_use_supabase(settings) and user_id:
        try:
            j = jobs_supabase.get_job(settings, user_id, req.job_id)
            title = j["title"]
            company = j["company"]
        except KeyError:
            raise HTTPException(status_code=404, detail="Job not found") from None
    if not title or not company:
        raise HTTPException(
            status_code=400,
            detail="Provide job_id (when signed in with persistence) or both job_title and company.",
        )
    job_info = {"title": title, "company": company}
    try:
        raw = await generate_thank_you(
            job_info,
            interviewer_name=req.interviewer_name,
            interview_notes=req.interview_notes,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    saved_id: str | None = None
    if _outreach_db(settings, user_id):
        assert user_id is not None
        recipient = (req.interviewer_name or "").strip() or "Interview thank-you"
        try:
            saved = outreach_sb.insert_message(
                settings,
                user_id,
                message_type="email",
                recipient_name=recipient,
                recipient_role=None,
                subject=raw["subject"],
                body=raw["body"],
            )
            saved_id = saved["id"]
        except RuntimeError:
            pass
    else:
        mem_id = f"msg-{uuid.uuid4().hex[:12]}"
        outreach_messages(user_id).append(
            {
                "id": mem_id,
                "message_type": "email",
                "recipient_name": (req.interviewer_name or "").strip() or "Interview thank-you",
                "recipient_role": None,
                "subject": raw["subject"],
                "body": raw["body"],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        saved_id = mem_id

    return ThankYouResponse(subject=raw["subject"], body=raw["body"], saved_outreach_id=saved_id)


@router.get("/outreach")
async def list_outreach(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    if _outreach_db(settings, user_id):
        return outreach_sb.list_messages(settings, user_id)
    msgs = outreach_messages(user_id)
    return list(reversed(msgs))
