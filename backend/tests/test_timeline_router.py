"""Router tests for app/routers/timeline.py.

Covers HTTP boundary for the application-timeline endpoints:
- GET /timeline/{job_id}    builds an aggregated event feed for one job
- POST /timeline            creates a manual event
- DELETE /timeline/{id}     removes a manual event

Service-layer behaviour (event aggregation, sort order) is partially exercised
in test_timeline_service.py; this file verifies wiring, validation, and the
in-memory store fallback.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import (
    contacts as mem_contacts,
    interview_notes as mem_interviews,
    job_store,
    outreach_messages as mem_outreach,
    timeline_events as mem_timeline,
)
from app.routers import timeline as timeline_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(timeline_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-timeline-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    # Clear every per-user store the timeline router reads from.
    mem_timeline(fake_user).clear()
    mem_interviews(fake_user).clear()
    mem_outreach(fake_user).clear()
    mem_contacts(fake_user).clear()
    job_store(fake_user).clear()


# ── POST /timeline ───────────────────────────────────────────────────────────


def test_create_event_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/timeline",
        json={
            "job_id": "job-1",
            "event_type": "note",
            "title": "Phone screen scheduled",
            "description": "30 min with hiring manager.",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["id"].startswith("evt-")
    assert body["job_id"] == "job-1"
    assert body["event_type"] == "note"
    assert body["title"] == "Phone screen scheduled"
    assert body["description"] == "30 min with hiring manager."
    assert "created_at" in body
    assert "occurred_at" in body and body["occurred_at"]


def test_create_event_missing_job_id_returns_422(authed_client: TestClient):
    """`job_id` is the only required field on TimelineEventCreate."""
    r = authed_client.post(
        "/api/v1/timeline",
        json={"title": "Orphan event", "description": "no job"},
    )
    assert r.status_code == 422


def test_create_event_minimal_body(authed_client: TestClient):
    """Only `job_id` is required — empty title/description are accepted."""
    r = authed_client.post("/api/v1/timeline", json={"job_id": "job-x"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["job_id"] == "job-x"
    assert body["event_type"] == "note"  # schema default
    assert body["title"] == ""
    assert body["description"] == ""


def test_create_event_with_explicit_occurred_at(authed_client: TestClient):
    """When the client supplies occurred_at, it is preserved verbatim."""
    when = "2026-01-15T10:30:00+00:00"
    r = authed_client.post(
        "/api/v1/timeline",
        json={"job_id": "job-1", "title": "Past event", "occurred_at": when},
    )
    assert r.status_code == 201
    assert r.json()["occurred_at"] == when


# ── GET /timeline/{job_id} ───────────────────────────────────────────────────


def test_get_timeline_unknown_job_returns_minimal_feed(authed_client: TestClient):
    """Unknown job_id is not 404; the router builds a stub job and returns
    its auto 'bookmarked' event (and nothing else)."""
    r = authed_client.get("/api/v1/timeline/job-unknown")
    assert r.status_code == 200
    rows = r.json()
    # build_job_timeline always emits an auto-created bookmarked event.
    assert isinstance(rows, list)
    assert any(e.get("event_type") == "status_change" for e in rows)


def test_get_timeline_includes_manual_events(authed_client: TestClient):
    """Manual events created via POST /timeline are reflected in GET output."""
    payload = {
        "job_id": "job-42",
        "event_type": "note",
        "title": "Recruiter follow-up",
        "description": "Asked about visa policy.",
    }
    create_resp = authed_client.post("/api/v1/timeline", json=payload)
    assert create_resp.status_code == 201
    new_id = create_resp.json()["id"]

    r = authed_client.get("/api/v1/timeline/job-42")
    assert r.status_code == 200
    rows = r.json()
    assert any(e.get("id") == new_id for e in rows)
    # Find our event and check it preserves fields.
    ours = next(e for e in rows if e.get("id") == new_id)
    assert ours["title"] == "Recruiter follow-up"
    assert ours["job_id"] == "job-42"


def test_get_timeline_filters_other_job_events(authed_client: TestClient):
    """Manual events for a different job_id are not included in this feed."""
    authed_client.post(
        "/api/v1/timeline",
        json={"job_id": "job-A", "title": "A event"},
    )
    authed_client.post(
        "/api/v1/timeline",
        json={"job_id": "job-B", "title": "B event"},
    )

    r = authed_client.get("/api/v1/timeline/job-A")
    assert r.status_code == 200
    rows = r.json()
    # No event in job-A's feed should belong to job-B.
    assert all(e.get("job_id") != "job-B" for e in rows)
    assert any(e.get("title") == "A event" for e in rows)


def test_get_timeline_sorts_newest_first(authed_client: TestClient):
    """build_job_timeline sorts events by occurred_at descending."""
    # Older event.
    authed_client.post(
        "/api/v1/timeline",
        json={
            "job_id": "job-sort",
            "title": "Older",
            "occurred_at": "2026-01-01T00:00:00+00:00",
        },
    )
    # Newer event.
    authed_client.post(
        "/api/v1/timeline",
        json={
            "job_id": "job-sort",
            "title": "Newer",
            "occurred_at": "2026-03-01T00:00:00+00:00",
        },
    )

    r = authed_client.get("/api/v1/timeline/job-sort")
    assert r.status_code == 200
    rows = r.json()
    titles = [e.get("title") for e in rows if e.get("title") in ("Older", "Newer")]
    assert titles == ["Newer", "Older"]


# ── DELETE /timeline/{id} ────────────────────────────────────────────────────


def test_delete_event_happy_then_404(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/timeline",
        json={"job_id": "job-1", "title": "Delete me"},
    ).json()
    evt_id = created["id"]

    r = authed_client.delete(f"/api/v1/timeline/{evt_id}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    # Re-deleting the same id 404s.
    r2 = authed_client.delete(f"/api/v1/timeline/{evt_id}")
    assert r2.status_code == 404


def test_delete_event_unknown_id_returns_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/timeline/evt-doesnotexist")
    assert r.status_code == 404
