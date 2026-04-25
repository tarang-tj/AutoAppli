"""Router tests for app/routers/cover_letter.py.

Covers the HTTP boundary: request validation, dependency wiring, in-memory
persistence, and error handling. Service-level behaviour (template fallback,
prompt construction) is already covered by test_cover_letter_service.py — this
file does not duplicate that.

The autouse fixture in conftest.py mocks
`app.services.cover_letter_service.generate_text` whenever
ANTHROPIC_API_KEY="test-key-not-real" (the CI placeholder), so most happy-path
tests need no explicit patching. Tests that care about a *specific* return
value patch on top.
"""
from __future__ import annotations

import os
import sys

# Add backend dir to sys.path (mirrors the pattern in test_resume_router.py).
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import cover_letters
from app.routers import cover_letter as cover_letter_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(cover_letter_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-cover-letter-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    cover_letters(fake_user).clear()


# ── /cover-letter/generate (POST) ────────────────────────────────────────────


def test_generate_happy_path(authed_client: TestClient):
    """Default tone, all required-ish fields. Asserts response shape."""
    r = authed_client.post(
        "/api/v1/cover-letter/generate",
        json={
            "job_title": "Backend Engineer",
            "company": "Acme",
            "job_description": "Build APIs at scale.",
            "resume_text": "Jane Doe — 5y Python.",
            "tone": "professional",
            "instructions": "",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"].startswith("cl-")
    assert body["tone"] == "professional"
    assert "content" in body and len(body["content"]) > 0
    assert "created_at" in body and body["created_at"]


@pytest.mark.parametrize("tone", ["professional", "enthusiastic", "conversational", "formal"])
def test_generate_tone_passthrough(authed_client: TestClient, tone: str):
    """Each supported tone is echoed back in the response."""
    r = authed_client.post(
        "/api/v1/cover-letter/generate",
        json={
            "job_title": "Software Engineer",
            "company": "TestCo",
            "tone": tone,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["tone"] == tone


def test_generate_empty_body_uses_defaults(authed_client: TestClient):
    """The schema gives every field a default — empty {} is a valid request."""
    r = authed_client.post("/api/v1/cover-letter/generate", json={})
    # All fields default to "" / "professional"; should still produce a draft.
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"].startswith("cl-")
    assert body["tone"] == "professional"


def test_generate_rejects_non_dict_body(authed_client: TestClient):
    """Pydantic should reject a JSON array (not an object)."""
    r = authed_client.post("/api/v1/cover-letter/generate", json=[])
    assert r.status_code == 422


def test_generate_anthropic_runtime_error_500(authed_client: TestClient):
    """When generate_cover_letter raises, the router surfaces 500 with the message."""
    with patch(
        "app.routers.cover_letter.generate_cover_letter",
        new=AsyncMock(side_effect=RuntimeError("Claude blew up")),
    ):
        r = authed_client.post(
            "/api/v1/cover-letter/generate",
            json={"job_title": "PM", "company": "Acme"},
        )
    assert r.status_code == 500
    assert "Claude blew up" in r.json()["detail"]


def test_generate_uses_mocked_anthropic_text(authed_client: TestClient):
    """When we patch generate_cover_letter per-test, the router returns that exact body."""
    canned = "Custom mocked cover letter content here."
    import uuid as _uuid
    fake_id = f"cl-{_uuid.uuid4().hex[:12]}"
    fake_result = {
        "id": fake_id,
        "content": canned,
        "tone": "enthusiastic",
        "created_at": "2026-01-01T00:00:00+00:00",
    }
    with patch(
        "app.routers.cover_letter.generate_cover_letter",
        new=AsyncMock(return_value=fake_result),
    ):
        r = authed_client.post(
            "/api/v1/cover-letter/generate",
            json={
                "job_title": "Backend",
                "company": "Acme",
                "tone": "enthusiastic",
            },
        )
    assert r.status_code == 200
    body = r.json()
    assert body["content"] == canned
    assert body["tone"] == "enthusiastic"


# ── /cover-letter/history (GET) ──────────────────────────────────────────────


def test_history_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/cover-letter/history")
    assert r.status_code == 200
    assert r.json() == []


def test_history_populated_after_generate(authed_client: TestClient):
    """A successful generate is persisted to the in-memory store and shows up in history."""
    gen = authed_client.post(
        "/api/v1/cover-letter/generate",
        json={"job_title": "PM", "company": "Acme"},
    )
    assert gen.status_code == 200
    cl_id = gen.json()["id"]

    r = authed_client.get("/api/v1/cover-letter/history")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["id"] == cl_id


# ── /cover-letter/{id} (DELETE) ──────────────────────────────────────────────


def test_delete_happy_path_then_404(authed_client: TestClient):
    gen = authed_client.post(
        "/api/v1/cover-letter/generate",
        json={"job_title": "PM", "company": "Acme"},
    ).json()
    cl_id = gen["id"]

    r = authed_client.delete(f"/api/v1/cover-letter/{cl_id}")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"

    # Re-deleting the same id now 404s.
    r2 = authed_client.delete(f"/api/v1/cover-letter/{cl_id}")
    assert r2.status_code == 404


def test_delete_unknown_id_returns_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/cover-letter/cl-doesnotexist")
    assert r.status_code == 404
