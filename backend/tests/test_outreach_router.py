"""Router tests for app/routers/outreach.py.

Mocks the Anthropic-backed `generate_text` function so no real API is hit.
Supabase is left unconfigured; the router falls back to its in-memory
per-user store, which keeps the tests hermetic.
"""
from __future__ import annotations

import os
import sys

# Add the backend dir to sys.path so `app.*` imports resolve when pytest
# is run from `backend/` (matches the pattern in tests/test_eval_service.py).
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import outreach_messages
from app.routers import outreach as outreach_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(outreach_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-outreach-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    # Clear per-user in-memory outreach store between tests.
    outreach_messages(fake_user).clear()


# ── /outreach/generate ───────────────────────────────────────────────────────


def test_generate_email_happy_path(authed_client: TestClient):
    """Email path: Claude returns SUBJECT/BODY → router parses and persists."""
    raw = "SUBJECT: Quick intro\nBODY: Hi Dan,\n\nI'd love to chat about the role.\n\n— Jane"
    with patch(
        "app.services.outreach_service.generate_text",
        new=AsyncMock(return_value=raw),
    ):
        r = authed_client.post(
            "/api/v1/outreach/generate",
            json={
                "message_type": "email",
                "recipient_name": "Dan Recruiter",
                "recipient_role": "Recruiter",
                "job_title": "Backend Engineer",
                "company": "Acme",
                "applicant_name": "Jane Doe",
            },
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"].startswith("msg-")
    assert body["message_type"] == "email"
    assert body["recipient_name"] == "Dan Recruiter"
    assert body["subject"] == "Quick intro"
    assert "love to chat" in body["body"]
    assert body["message_purpose"] == "outreach"


def test_generate_linkedin_happy_path(authed_client: TestClient):
    """LinkedIn path: there's no SUBJECT/BODY split — body is the raw output."""
    raw = "Hi Dan, I'm interested in the Backend Engineer role at Acme. Open to chat?"
    with patch(
        "app.services.outreach_service.generate_text",
        new=AsyncMock(return_value=raw),
    ):
        r = authed_client.post(
            "/api/v1/outreach/generate",
            json={
                "message_type": "linkedin",
                "recipient_name": "Dan Recruiter",
                "recipient_role": "Recruiter",
                "job_title": "Backend Engineer",
                "company": "Acme",
            },
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["message_type"] == "linkedin"
    assert "Backend Engineer" in body["body"]
    # LinkedIn has no subject.
    assert body["subject"] in (None, "")


def test_generate_invalid_message_type_422(authed_client: TestClient):
    """The schema enforces email|linkedin via regex."""
    r = authed_client.post(
        "/api/v1/outreach/generate",
        json={"message_type": "carrier-pigeon", "recipient_name": "Dan"},
    )
    assert r.status_code == 422


def test_generate_anthropic_runtime_error_500(authed_client: TestClient):
    with patch(
        "app.services.outreach_service.generate_text",
        new=AsyncMock(side_effect=RuntimeError("Claude down")),
    ):
        r = authed_client.post(
            "/api/v1/outreach/generate",
            json={
                "message_type": "email",
                "recipient_name": "Dan",
                "recipient_role": "Recruiter",
                "job_title": "Backend Engineer",
                "company": "Acme",
            },
        )
    assert r.status_code == 500
    assert "Claude down" in r.json()["detail"]


# ── /outreach/thank-you ──────────────────────────────────────────────────────


def test_thank_you_happy_path(authed_client: TestClient):
    raw_body = "Thank you for taking the time to chat today about the Backend role.\n\nBest, Jane"
    with patch(
        "app.services.outreach_service.generate_text",
        new=AsyncMock(return_value=raw_body),
    ):
        r = authed_client.post(
            "/api/v1/outreach/thank-you",
            json={
                "job_title": "Backend Engineer",
                "company": "Acme",
                "interviewer_name": "Pat Smith",
                "interview_notes": "Discussed system design and team culture.",
            },
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "Backend Engineer" in body["subject"]
    assert "Thank you" in body["body"]
    # In-memory persistence yields a saved id.
    assert body["saved_outreach_id"]


def test_thank_you_optional_fields_omitted(authed_client: TestClient):
    """interviewer_name and interview_notes are optional — endpoint still works."""
    raw_body = "Thanks for chatting today. Looking forward to next steps."
    with patch(
        "app.services.outreach_service.generate_text",
        new=AsyncMock(return_value=raw_body),
    ):
        r = authed_client.post(
            "/api/v1/outreach/thank-you",
            json={"job_title": "PM", "company": "Acme"},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["subject"]
    assert body["body"]


def test_thank_you_missing_title_or_company_400(authed_client: TestClient):
    """Without job_id and without job_title+company, the router returns 400."""
    r = authed_client.post(
        "/api/v1/outreach/thank-you",
        json={"job_title": "", "company": ""},
    )
    assert r.status_code == 400


def test_thank_you_anthropic_runtime_error_502(authed_client: TestClient):
    with patch(
        "app.services.outreach_service.generate_text",
        new=AsyncMock(side_effect=RuntimeError("model down")),
    ):
        r = authed_client.post(
            "/api/v1/outreach/thank-you",
            json={"job_title": "Backend", "company": "Acme"},
        )
    assert r.status_code == 502


# ── /outreach (list) ─────────────────────────────────────────────────────────


def test_list_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/outreach")
    assert r.status_code == 200
    assert r.json() == []


def test_list_returns_drafts_after_generate(authed_client: TestClient):
    raw = "SUBJECT: Hi\nBODY: Quick intro about the role."
    with patch(
        "app.services.outreach_service.generate_text",
        new=AsyncMock(return_value=raw),
    ):
        authed_client.post(
            "/api/v1/outreach/generate",
            json={
                "message_type": "email",
                "recipient_name": "Dan",
                "recipient_role": "Recruiter",
                "job_title": "Backend",
                "company": "Acme",
            },
        )
    r = authed_client.get("/api/v1/outreach")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["recipient_name"] == "Dan"


# ── /outreach/{id} (delete) ──────────────────────────────────────────────────


def test_delete_existing_message(authed_client: TestClient):
    raw = "SUBJECT: Hi\nBODY: Hello there"
    with patch(
        "app.services.outreach_service.generate_text",
        new=AsyncMock(return_value=raw),
    ):
        gen = authed_client.post(
            "/api/v1/outreach/generate",
            json={
                "message_type": "email",
                "recipient_name": "Dan",
                "recipient_role": "Recruiter",
                "job_title": "Backend",
                "company": "Acme",
            },
        ).json()
    msg_id = gen["id"]

    r = authed_client.delete(f"/api/v1/outreach/{msg_id}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    # Re-deleting the same id should now 404.
    r2 = authed_client.delete(f"/api/v1/outreach/{msg_id}")
    assert r2.status_code == 404


def test_delete_unknown_id_returns_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/outreach/msg-nope")
    assert r.status_code == 404
