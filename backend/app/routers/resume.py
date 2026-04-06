from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.models.schemas import ResumeGenerateRequest, ResumeGenerateResponse
from app.services.resume_generator import generate_tailored_resume
from app.services.resume_parser import extract_text_from_pdf

router = APIRouter(tags=["resume"])

_resumes: dict[str, dict] = {}


@router.post("/resumes/upload")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    contents = await file.read()
    parsed_text = extract_text_from_pdf(contents)

    resume_id = f"resume-{uuid.uuid4().hex[:12]}"
    resume_record = {
        "id": resume_id,
        "file_name": file.filename,
        "storage_path": f"resumes/{resume_id}.pdf",
        "parsed_text": parsed_text,
        "is_primary": len(_resumes) == 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _resumes[resume_id] = resume_record
    return resume_record


@router.get("/resumes")
async def list_resumes():
    return list(_resumes.values())


@router.post("/resumes/generate", response_model=ResumeGenerateResponse)
async def generate_resume(req: ResumeGenerateRequest):
    resume_text = req.resume_text
    if not resume_text and req.resume_id in _resumes:
        resume_text = _resumes[req.resume_id].get("parsed_text", "")

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No resume text available. Upload a resume first or provide resume_text.",
        )

    try:
        result = await generate_tailored_resume(resume_text, req.job_description)
        return ResumeGenerateResponse(**result)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
