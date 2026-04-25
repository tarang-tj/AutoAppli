"""Router tests for app/routers/jobs.py.

Exercises the kanban CRUD endpoints with TestClient. Supabase is left
unconfigured so the router falls back to its in-memory store
(`jobs_memory`). The in-memory store is module-level state, so each
test clears it via the autouse fixture.
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
from app.repositories import jobs_memory
from app.routers import jobs as jobs_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    """Minimal FastAPI app with only the jobs router mounted."""
    a = FastAPI()
    a.include_router(jobs_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def _reset_jobs_memory():
    """Clear the module-level in-memory jobs store between tests."""
    jobs_memory._jobs.clear()
    yield
    jobs_memory._jobs.clear()


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    """A TestClient where get_jobs_user_id is overridden to a fake user.

    With SUPABASE_* envs empty in CI, `_persisted()` is False so user_id
    never affects routing — but we override anyway to mirror the pattern
    in test_resume_router.py.
    """
    fake_user = "user-jobs-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── POST /jobs ───────────────────────────────────────────────────────────────


def test_create_job_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/jobs",
        json={
            "company": "Acme",
            "title": "Backend Engineer",
            "url": "https://acme.example/jobs/123",
            "source": "manual",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"].startswith("job-")
    assert body["company"] == "Acme"
    assert body["title"] == "Backend Engineer"
    assert body["status"] == "bookmarked"
    assert body["source"] == "manual"
    assert body["applied_at"] is None


def test_create_job_missing_required_fields_422(authed_client: TestClient):
    """Pydantic should reject payloads missing company/title."""
    r = authed_client.post("/api/v1/jobs", json={"company": "Acme"})
    assert r.status_code == 422


def test_create_job_duplicate_url_returns_duplicate_flag(authed_client: TestClient):
    """Posting the same URL twice flags the second as duplicate."""
    payload = {
        "company": "Acme",
        "title": "Backend Engineer",
        "url": "https://acme.example/jobs/123",
    }
    first = authed_client.post("/api/v1/jobs", json=payload)
    assert first.status_code == 200
    second = authed_client.post("/api/v1/jobs", json=payload)
    assert second.status_code == 200
    body = second.json()
    assert body.get("duplicate") is True
    # Same id as the first row — the router returns the existing record.
    assert body["id"] == first.json()["id"]


def test_create_job_with_fetch_full_description_calls_scraper(authed_client: TestClient):
    """When fetch_full_description=True, the scraper is invoked and its
    description is used."""
    scraped = {"description": "Scraped JD content describing role."}
    with patch(
        "app.routers.jobs.scraper_service.scrape_job_details",
        new=AsyncMock(return_value=scraped),
    ) as mock_scrape:
        r = authed_client.post(
            "/api/v1/jobs",
            json={
                "company": "Acme",
                "title": "Backend Engineer",
                "url": "https://acme.example/jobs/789",
                "fetch_full_description": True,
            },
        )
    assert r.status_code == 200
    assert mock_scrape.await_count == 1
    assert "Scraped JD content" in r.json()["description"]


# ── GET /jobs (list) ─────────────────────────────────────────────────────────


def test_list_jobs_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/jobs")
    assert r.status_code == 200
    assert r.json() == []


def test_list_jobs_returns_created(authed_client: TestClient):
    authed_client.post(
        "/api/v1/jobs",
        json={"company": "Acme", "title": "BE Engineer"},
    )
    authed_client.post(
        "/api/v1/jobs",
        json={"company": "Initech", "title": "FE Engineer"},
    )
    r = authed_client.get("/api/v1/jobs")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 2
    companies = {row["company"] for row in rows}
    assert companies == {"Acme", "Initech"}


def test_list_jobs_filtered_by_status(authed_client: TestClient):
    """Default new jobs are 'bookmarked'; filtering on a different status
    should return an empty list."""
    authed_client.post(
        "/api/v1/jobs", json={"company": "Acme", "title": "BE Engineer"}
    )
    r = authed_client.get("/api/v1/jobs?status=applied")
    assert r.status_code == 200
    assert r.json() == []


# ── GET /jobs/{id} ───────────────────────────────────────────────────────────


def test_get_job_happy_path(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/jobs", json={"company": "Acme", "title": "BE Engineer"}
    ).json()
    r = authed_client.get(f"/api/v1/jobs/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


def test_get_job_unknown_id_404(authed_client: TestClient):
    r = authed_client.get("/api/v1/jobs/job-doesnotexist")
    assert r.status_code == 404


# ── PATCH /jobs/{id} ─────────────────────────────────────────────────────────


def test_patch_job_status_transition_sets_applied_at(authed_client: TestClient):
    """Moving from bookmarked → applied stamps applied_at."""
    created = authed_client.post(
        "/api/v1/jobs", json={"company": "Acme", "title": "BE Engineer"}
    ).json()
    assert created["applied_at"] is None
    r = authed_client.patch(
        f"/api/v1/jobs/{created['id']}", json={"status": "applied"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "applied"
    assert body["applied_at"] is not None


def test_patch_job_notes(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/jobs", json={"company": "Acme", "title": "BE Engineer"}
    ).json()
    r = authed_client.patch(
        f"/api/v1/jobs/{created['id']}", json={"notes": "phone screen Mon"}
    )
    assert r.status_code == 200
    assert r.json()["notes"] == "phone screen Mon"


def test_patch_job_empty_body_422(authed_client: TestClient):
    """Router requires at least one field — empty payload → 422."""
    created = authed_client.post(
        "/api/v1/jobs", json={"company": "Acme", "title": "BE Engineer"}
    ).json()
    r = authed_client.patch(f"/api/v1/jobs/{created['id']}", json={})
    assert r.status_code == 422


def test_patch_job_unknown_id_404(authed_client: TestClient):
    r = authed_client.patch(
        "/api/v1/jobs/job-doesnotexist", json={"status": "applied"}
    )
    assert r.status_code == 404


def test_patch_job_invalid_status_422(authed_client: TestClient):
    """The Literal status field rejects unknown strings."""
    created = authed_client.post(
        "/api/v1/jobs", json={"company": "Acme", "title": "BE Engineer"}
    ).json()
    r = authed_client.patch(
        f"/api/v1/jobs/{created['id']}", json={"status": "pending-doom"}
    )
    assert r.status_code == 422


# ── DELETE /jobs/{id} ────────────────────────────────────────────────────────


def test_delete_job_happy_path(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/jobs", json={"company": "Acme", "title": "BE Engineer"}
    ).json()
    r = authed_client.delete(f"/api/v1/jobs/{created['id']}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
    # Re-fetching the same id now 404s.
    r2 = authed_client.get(f"/api/v1/jobs/{created['id']}")
    assert r2.status_code == 404


def test_delete_job_unknown_id_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/jobs/job-doesnotexist")
    assert r.status_code == 404


# ── PUT /jobs/reorder ────────────────────────────────────────────────────────


def test_reorder_jobs_happy_path(authed_client: TestClient):
    a = authed_client.post(
        "/api/v1/jobs", json={"company": "A", "title": "x"}
    ).json()
    b = authed_client.post(
        "/api/v1/jobs", json={"company": "B", "title": "y"}
    ).json()
    r = authed_client.put(
        "/api/v1/jobs/reorder",
        json={"status": "bookmarked", "ordered_ids": [b["id"], a["id"]]},
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_reorder_jobs_unknown_id_400(authed_client: TestClient):
    r = authed_client.put(
        "/api/v1/jobs/reorder",
        json={"status": "bookmarked", "ordered_ids": ["job-nope"]},
    )
    assert r.status_code == 400
