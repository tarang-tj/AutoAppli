"""Router tests for app/routers/resume.py.

Exercises the FastAPI endpoints with TestClient and mocks the Anthropic
SDK (`generate_text`) so no real API calls are made. Supabase is left
unconfigured so the router falls back to its in-memory per-user store —
this matches how the existing CI runs (empty SUPABASE_* envs).
"""
from __future__ import annotations

import os
import sys

# Add the backend dir to sys.path so `app.*` imports resolve when pytest
# is run from `backend/` (matches the pattern in tests/test_eval_service.py).
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import io
from unittest.mock import patch, AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import resume_store
from app.routers import resume as resume_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    """A minimal FastAPI app with only the resume router mounted."""
    a = FastAPI()
    a.include_router(resume_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    """A TestClient where get_jobs_user_id is overridden to return a fake user.

    Note: SUPABASE_* envs are empty in CI, so `_resume_db()` is False and
    the router uses its in-memory per-user store. The fake user_id still
    keys into that store.
    """
    fake_user = "user-test-123"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    # Clean up the per-user in-memory store so tests don't bleed into each other.
    store = resume_store(fake_user)
    store.clear()


@pytest.fixture
def fake_pdf_bytes() -> bytes:
    """A minimal valid PDF that pypdf can parse."""
    # Hand-rolled tiny valid PDF (no text content; that's OK — pypdf returns "").
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f \n"
        b"0000000009 00000 n \n0000000052 00000 n \n0000000098 00000 n \n"
        b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF\n"
    )


# ── /resumes/upload ──────────────────────────────────────────────────────────


def test_upload_pdf_happy_path(authed_client: TestClient, fake_pdf_bytes: bytes):
    files = {"file": ("resume.pdf", io.BytesIO(fake_pdf_bytes), "application/pdf")}
    r = authed_client.post("/api/v1/resumes/upload", files=files)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"].startswith("resume-")
    assert body["file_name"] == "resume.pdf"
    assert body["is_primary"] is True  # first resume → primary
    assert "parsed_text" in body


def test_upload_rejects_non_pdf(authed_client: TestClient):
    files = {"file": ("notes.txt", io.BytesIO(b"hello world"), "text/plain")}
    r = authed_client.post("/api/v1/resumes/upload", files=files)
    assert r.status_code == 400
    assert "PDF" in r.json()["detail"]


def test_upload_rejects_pdf_with_wrong_extension(authed_client: TestClient):
    files = {"file": ("resume.docx", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf")}
    r = authed_client.post("/api/v1/resumes/upload", files=files)
    assert r.status_code == 400


# ── /resumes (list) ──────────────────────────────────────────────────────────


def test_list_resumes_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/resumes")
    assert r.status_code == 200
    assert r.json() == []


def test_list_resumes_after_upload(authed_client: TestClient, fake_pdf_bytes: bytes):
    files = {"file": ("resume.pdf", io.BytesIO(fake_pdf_bytes), "application/pdf")}
    authed_client.post("/api/v1/resumes/upload", files=files)
    r = authed_client.get("/api/v1/resumes")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["file_name"] == "resume.pdf"


# ── /resumes/generated (list) ────────────────────────────────────────────────


def test_list_generated_returns_empty_without_supabase(authed_client: TestClient):
    """With Supabase unconfigured, the endpoint short-circuits to []."""
    r = authed_client.get("/api/v1/resumes/generated")
    assert r.status_code == 200
    assert r.json() == []


# ── /resumes/generated/{id} (delete) ─────────────────────────────────────────


def test_delete_generated_404_when_no_supabase(authed_client: TestClient):
    """With no Supabase storage, deletes raise 404 (no per-session storage)."""
    r = authed_client.delete("/api/v1/resumes/generated/doc-doesnotexist")
    assert r.status_code == 404


# ── /resumes/generate ────────────────────────────────────────────────────────


def test_generate_happy_path(authed_client: TestClient):
    """Mocks Claude and asserts response shape."""
    mock_text = (
        "Jane Doe\njane@example.com\n\nSUMMARY\nSenior engineer.\n\n"
        "EXPERIENCE\n- Built things at Acme Corp"
    )
    with patch(
        "app.services.claude_service.generate_text",
        new=AsyncMock(return_value=mock_text),
    ):
        r = authed_client.post(
            "/api/v1/resumes/generate",
            json={
                "resume_id": "resume-fake",
                "resume_text": "Jane Doe — engineer",
                "job_description": "Senior backend engineer at Acme",
                "include_pdf": False,
            },
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"].startswith("doc-")
    assert body["doc_type"] == "tailored_resume"
    assert "content" in body and len(body["content"]) > 0
    # eval_result is best-effort; either a dict shape or None is fine.
    assert "eval_result" in body


def test_generate_no_resume_text_returns_400(authed_client: TestClient):
    """When neither resume_text nor a stored resume exists, 400."""
    with patch(
        "app.services.claude_service.generate_text",
        new=AsyncMock(return_value="ignored"),
    ):
        r = authed_client.post(
            "/api/v1/resumes/generate",
            json={
                "resume_id": "resume-missing",
                "resume_text": "",
                "job_description": "Senior backend engineer",
            },
        )
    assert r.status_code == 400
    assert "resume" in r.json()["detail"].lower()


def test_generate_missing_required_field_422(authed_client: TestClient):
    """Pydantic should reject payloads that omit a required field (resume_id)."""
    r = authed_client.post(
        "/api/v1/resumes/generate",
        json={"job_description": "x", "resume_text": "y"},
    )
    assert r.status_code == 422


def test_generate_anthropic_runtime_error_500(authed_client: TestClient):
    """When the AI service raises RuntimeError, the router surfaces 500."""
    with patch(
        "app.services.claude_service.generate_text",
        new=AsyncMock(side_effect=RuntimeError("Claude exploded")),
    ):
        r = authed_client.post(
            "/api/v1/resumes/generate",
            json={
                "resume_id": "resume-fake",
                "resume_text": "Jane Doe",
                "job_description": "Senior backend",
            },
        )
    assert r.status_code == 500
    assert "Claude exploded" in r.json()["detail"]


def test_generate_uses_uploaded_resume_text(
    authed_client: TestClient, fake_pdf_bytes: bytes
):
    """If resume_text is empty but resume_id matches an uploaded resume,
    the router pulls parsed_text from the in-memory store."""
    # Upload first.
    files = {"file": ("resume.pdf", io.BytesIO(fake_pdf_bytes), "application/pdf")}
    up = authed_client.post("/api/v1/resumes/upload", files=files).json()
    # Manually seed parsed_text since the fake PDF has none.
    fake_user = "user-test-123"
    resume_store(fake_user)[up["id"]]["parsed_text"] = "Jane Doe seeded resume"

    with patch(
        "app.services.claude_service.generate_text",
        new=AsyncMock(return_value="Tailored content"),
    ):
        r = authed_client.post(
            "/api/v1/resumes/generate",
            json={
                "resume_id": up["id"],
                "resume_text": "",
                "job_description": "Backend role",
                "include_pdf": False,
            },
        )
    assert r.status_code == 200
    assert "Tailored content" in r.json()["content"]


# ── /resumes/review ──────────────────────────────────────────────────────────


def test_review_happy_path(authed_client: TestClient):
    """Mocks Claude returning a valid JSON review response."""
    mock_json = (
        '{"overall_score": 8, "ats_score": 7, '
        '"strengths": ["Strong technical skills"], '
        '"improvements": ["Add metrics"], '
        '"ats_issues": [], "missing_sections": [], '
        '"keyword_suggestions": ["Python"]}'
    )
    with patch(
        "app.services.claude_service.generate_text",
        new=AsyncMock(return_value=mock_json),
    ):
        r = authed_client.post(
            "/api/v1/resumes/review",
            json={"resume_id": "", "resume_text": "Jane Doe — engineer with 5y exp"},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"].startswith("rev-")
    assert body["overall_score"] == 8
    assert "strengths" in body


def test_review_no_resume_text_returns_400(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/resumes/review",
        json={"resume_id": "", "resume_text": ""},
    )
    assert r.status_code == 400


def test_review_anthropic_runtime_error_502(authed_client: TestClient):
    """Review surfaces RuntimeError as 502 (Bad Gateway-style upstream)."""
    with patch(
        "app.services.claude_service.generate_text",
        new=AsyncMock(side_effect=RuntimeError("model unavailable")),
    ):
        r = authed_client.post(
            "/api/v1/resumes/review",
            json={"resume_id": "", "resume_text": "Some resume content"},
        )
    assert r.status_code == 502


# ── /resumes/evaluate (no AI; pure scoring) ──────────────────────────────────


def test_evaluate_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/resumes/evaluate",
        json={
            "original_resume_text": "Python and FastAPI engineer",
            "tailored_resume_text": "Python, FastAPI, AWS engineer with 5y experience",
            "job_description": "Backend role: Python, FastAPI, AWS",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "overall_score" in body
    assert "keyword_coverage" in body
    assert "hallucination_check" in body
    assert "change_delta" in body


def test_evaluate_missing_tailored_returns_400(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/resumes/evaluate",
        json={
            "original_resume_text": "Some text",
            "tailored_resume_text": "   ",
            "job_description": "Some JD",
        },
    )
    assert r.status_code == 400


def test_evaluate_missing_jd_returns_400(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/resumes/evaluate",
        json={
            "original_resume_text": "Some text",
            "tailored_resume_text": "Some tailored text",
            "job_description": "",
        },
    )
    assert r.status_code == 400
