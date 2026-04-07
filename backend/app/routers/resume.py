from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.deps.jobs_auth import get_jobs_user_id
from app.models.schemas import (
    ResumeGenerateRequest,
    ResumeGenerateResponse,
    ResumeReviewRequest,
    ResumeReviewResponse,
)
from app.repositories.user_session_memory import resume_store
from app.services.resume_generator import generate_resume_review, generate_tailored_resume
from app.services.resume_parser import extract_text_from_pdf

router = APIRouter(tags=["resume"])


@router.post("/resumes/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str | None = Depends(get_jobs_user_id),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    contents = await file.read()
    parsed_text = extract_text_from_pdf(contents)

    store = resume_store(user_id)
    resume_id = f"resume-{uuid.uuid4().hex[:12]}"
    resume_record = {
        "id": resume_id,
        "file_name": file.filename,
        "storage_path": f"resumes/{resume_id}.pdf",
        "parsed_text": parsed_text,
        "is_primary": len(store) == 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    store[resume_id] = resume_record
    return resume_record


@router.get("/resumes")
async def list_resumes(user_id: str | None = Depends(get_jobs_user_id)):
    store = resume_store(user_id)
    rows = list(store.values())
    return sorted(rows, key=lambda r: r.get("created_at", ""))


@router.post("/resumes/generate", response_model=ResumeGenerateResponse)
async def generate_resume(
    req: ResumeGenerateRequest,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = resume_store(user_id)
    resume_text = req.resume_text
    if not resume_text and req.resume_id in store:
        resume_text = store[req.resume_id].get("parsed_text", "")

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No resume text available. Upload a resume first or provide resume_text.",
        )

    try:
        result = await generate_tailored_resume(
            resume_text,
            req.job_description,
            instructions=req.instructions.strip() or None,
            include_pdf=req.include_pdf,
        )
        return ResumeGenerateResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/resumes/review", response_model=ResumeReviewResponse)
async def review_resume(
    req: ResumeReviewRequest,
    user_id: str | None = Depends(get_jobs_user_id),
):
    store = resume_store(user_id)
    resume_text = req.resume_text.strip()
    if not resume_text and req.resume_id in store:
        resume_text = (store[req.resume_id].get("parsed_text") or "").strip()

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No resume text available. Upload a resume first or pass resume_text.",
        )

    try:
        return await generate_resume_review(resume_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
