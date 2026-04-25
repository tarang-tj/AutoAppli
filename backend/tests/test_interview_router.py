"""Router tests for app/routers/interview.py.

Two surfaces:
- POST /interviews/prep      AI route — generates structured prep JSON via Claude.
- /interviews CRUD           in-memory note management.

The conftest autouse mock patches `cover_letter_service.generate_text` only,
not `interview_service.generate_text`, so the prep tests patch that call site
explicitly. CRUD tests don't touch the AI surface at all.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import interview_notes as mem_interviews
from app.routers import interview as interview_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(interview_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-interview-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    mem_interviews(fake_user).clear()


# ── POST /interviews/prep (AI) ───────────────────────────────────────────────


_MOCK_PREP_JSON = (
    '{"company_overview": "Acme builds software.",'
    ' "role_insights": "Backend Python with FastAPI.",'
    ' "talking_points": ["scaled APIs", "led infra"],'
    ' "likely_questions": ["Tell me about a system you scaled"],'
    ' "questions_to_ask": ["What does success look like in 90d?"],'
    ' "tips": ["arrive early"]}'
)


def test_prep_happy_path(authed_client: TestClient):
    """Patching the interview_service.generate_text call site returns parsed JSON."""
    with patch(
        "app.services.interview_service.generate_text",
        new=AsyncMock(return_value=_MOCK_PREP_JSON),
    ):
        r = authed_client.post(
            "/api/v1/interviews/prep",
            json={
                "job_title": "Backend Engineer",
                "company": "Acme",
                "job_description": "Python + FastAPI",
                "resume_text": "Jane — Python 5y",
            },
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "prep" in body
    prep = body["prep"]
    assert "talking_points" in prep
    assert "likely_questions" in prep


def test_prep_strips_markdown_code_fences(authed_client: TestClient):
    """generate_interview_prep tolerates ```json fences around the body."""
    fenced = "```json\n" + _MOCK_PREP_JSON + "\n```"
    with patch(
        "app.services.interview_service.generate_text",
        new=AsyncMock(return_value=fenced),
    ):
        r = authed_client.post(
            "/api/v1/interviews/prep",
            json={"job_title": "BE", "company": "Acme"},
        )
    assert r.status_code == 200, r.text
    assert "talking_points" in r.json()["prep"]


def test_prep_runtime_error_returns_502(authed_client: TestClient):
    """When the AI call raises, the router surfaces 502 with the message."""
    with patch(
        "app.services.interview_service.generate_text",
        new=AsyncMock(side_effect=RuntimeError("model down")),
    ):
        r = authed_client.post(
            "/api/v1/interviews/prep",
            json={"job_title": "BE", "company": "Acme"},
        )
    assert r.status_code == 502
    assert "model down" in r.json()["detail"]


def test_prep_missing_required_fields_422(authed_client: TestClient):
    """job_title and company are required (no defaults)."""
    r = authed_client.post("/api/v1/interviews/prep", json={"company": "Acme"})
    assert r.status_code == 422


# ── POST /interviews ─────────────────────────────────────────────────────────


def test_create_note_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/interviews",
        json={
            "job_id": "job-1",
            "round_name": "Phone screen",
            "scheduled_at": "2026-04-30T15:00:00+00:00",
            "interviewer_name": "Pat Manager",
            "notes": "Bring portfolio.",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["id"].startswith("int-")
    assert body["job_id"] == "job-1"
    assert body["round_name"] == "Phone screen"
    assert body["status"] == "upcoming"


def test_create_note_minimal_body(authed_client: TestClient):
    """Only job_id is required."""
    r = authed_client.post("/api/v1/interviews", json={"job_id": "job-x"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["round_name"] == "General"  # service default
    assert body["interviewer_name"] == ""


def test_create_note_missing_job_id_422(authed_client: TestClient):
    r = authed_client.post("/api/v1/interviews", json={"round_name": "Phone"})
    assert r.status_code == 422


# ── GET /interviews ──────────────────────────────────────────────────────────


def test_list_notes_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/interviews")
    assert r.status_code == 200
    assert r.json() == []


def test_list_notes_filter_by_job_id(authed_client: TestClient):
    authed_client.post("/api/v1/interviews", json={"job_id": "job-A"})
    authed_client.post("/api/v1/interviews", json={"job_id": "job-B"})

    r = authed_client.get("/api/v1/interviews", params={"job_id": "job-A"})
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["job_id"] == "job-A"


# ── PATCH /interviews/{id} ───────────────────────────────────────────────────


def test_patch_note_status_transition(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/interviews", json={"job_id": "job-1"}
    ).json()
    r = authed_client.patch(
        f"/api/v1/interviews/{created['id']}",
        json={"status": "completed"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "completed"


def test_patch_note_unknown_id_404(authed_client: TestClient):
    r = authed_client.patch(
        "/api/v1/interviews/int-doesnotexist",
        json={"status": "completed"},
    )
    assert r.status_code == 404


# ── DELETE /interviews/{id} ──────────────────────────────────────────────────


def test_delete_note_happy_then_404(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/interviews", json={"job_id": "job-1"}
    ).json()

    r = authed_client.delete(f"/api/v1/interviews/{created['id']}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    r2 = authed_client.delete(f"/api/v1/interviews/{created['id']}")
    assert r2.status_code == 404


def test_delete_note_unknown_id_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/interviews/int-nope")
    assert r.status_code == 404
