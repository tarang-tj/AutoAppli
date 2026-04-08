from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.models.schemas import (
    ResumeGenerateRequest,
    ResumeGenerateResponse,
    ResumeReviewRequest,
    ResumeReviewResponse,
    SavedGeneratedDocument,
)
from app.repositories import documents_supabase as documents_sb
from app.repositories import resume_supabase as resume_sb
from app.repositories.user_session_memory import resume_store
from app.services.resume_generator import generate_resume_review, generate_tailored_resume
from app.services.resume_parser import extract_text_from_pdf

router = APIRouter(tags=["resume"])


def _resume_db(settings: Settings, user_id: str | None) -> bool:
    return bool(jobs_use_supabase(settings) and user_id)


def _resume_parsed_text(
    settings: Settings,
    user_id: str | None,
    resume_id: str,
    fallback_inline: str,
) -> str:
    if fallback_inline.strip():
        return fallback_inline
    if _resume_db(settings, user_id):
        assert user_id is not None
        row = resume_sb.get_resume(settings, user_id, resume_id)
        if row:
            return row.get("parsed_text", "") or ""
    store = resume_store(user_id)
    if resume_id in store:
        return store[resume_id].get("parsed_text", "") or ""
    return ""


@router.post("/resumes/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    contents = await file.read()
    parsed_text = extract_text_from_pdf(contents)

    if _resume_db(settings, user_id):
        is_primary = not resume_sb.user_has_any_resume(settings, user_id)
        try:
            return resume_sb.insert_resume(
                settings,
                user_id,
                file_name=file.filename,
                parsed_text=parsed_text,
                is_primary=is_primary,
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

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
async def list_resumes(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    if _resume_db(settings, user_id):
        return resume_sb.list_resumes(settings, user_id)
    store = resume_store(user_id)
    rows = list(store.values())
    return sorted(rows, key=lambda r: r.get("created_at", ""))


@router.get("/resumes/generated", response_model=list[SavedGeneratedDocument])
async def list_generated_resumes(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    if not _resume_db(settings, user_id):
        return []
    assert user_id is not None
    try:
        rows = documents_sb.list_documents(settings, user_id)
        return [SavedGeneratedDocument(**r) for r in rows]
    except RuntimeError:
        return []


@router.delete("/resumes/generated/{doc_id}")
async def delete_generated_resume(
    doc_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    if not _resume_db(settings, user_id):
        raise HTTPException(
            status_code=404,
            detail="No saved document storage for this session.",
        )
    assert user_id is not None
    try:
        ok = documents_sb.delete_document(settings, user_id, doc_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    if not ok:
        raise HTTPException(status_code=404, detail="Document not found") from None
    return {"ok": True}


@router.post("/resumes/generate", response_model=ResumeGenerateResponse)
async def generate_resume(
    req: ResumeGenerateRequest,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    resume_text = _resume_parsed_text(
        settings, user_id, req.resume_id, req.resume_text
    )

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
        out = ResumeGenerateResponse(**result)
        if _resume_db(settings, user_id):
            assert user_id is not None
            try:
                documents_sb.insert_tailored_resume(
                    settings,
                    user_id,
                    resume_id=req.resume_id,
                    job_description=req.job_description,
                    content=result.get("content") or "",
                )
            except Exception:
                pass
        return out
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/resumes/review", response_model=ResumeReviewResponse)
async def review_resume(
    req: ResumeReviewRequest,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    resume_text = _resume_parsed_text(
        settings, user_id, req.resume_id, req.resume_text
    ).strip()

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No resume text available. Upload a resume first or pass resume_text.",
        )

    try:
        return await generate_resume_review(resume_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
