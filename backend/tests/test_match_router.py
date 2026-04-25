"""Router tests for app/routers/match.py.

The router's only endpoint, POST /match/scores, batches a resume against
all jobs the user owns and returns per-job v2 (or legacy) scores.
Supabase is left unconfigured so the user's "all jobs" comes from the
in-memory store. No Anthropic call site here — match_v2 is pure Python.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.deps.jobs_auth import get_jobs_user_id
from app.middleware.rate_limit import limiter
from app.repositories import jobs_memory
from app.routers import match as match_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    """Minimal FastAPI app with the match router and the SlowAPI hookups.

    SlowAPI requires `app.state.limiter` to be set; otherwise the route
    decorator's `@limiter.limit` raises at request time. The default
    in-memory limiter starts fresh each pytest process and the per-test
    request count stays well under 60/minute, so no reset is required.
    """
    a = FastAPI()
    a.state.limiter = limiter
    a.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    a.add_middleware(SlowAPIMiddleware)
    a.include_router(match_router.router, prefix="/api/v1")
    return a


@pytest.fixture(autouse=True)
def _reset_jobs_memory():
    jobs_memory._jobs.clear()
    yield
    jobs_memory._jobs.clear()


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-match-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()


def _seed_job(**overrides) -> dict:
    """Insert a single job into the in-memory store and return it."""
    defaults = dict(
        company="Acme",
        title="Senior Backend Engineer",
        url="https://acme.example/jobs/abc",
        description="Build APIs in Python with FastAPI and PostgreSQL on AWS.",
        source="manual",
    )
    defaults.update(overrides)
    return jobs_memory.create_job(
        defaults["company"],
        defaults["title"],
        defaults["url"],
        defaults["description"],
        defaults["source"],
    )


# ── POST /match/scores ───────────────────────────────────────────────────────


def test_match_scores_v2_happy_path(authed_client: TestClient):
    """A resume that mentions multiple skills the JD asks for should
    produce a v2 score entry per job with breakdown + matched_skills."""
    job = _seed_job()
    r = authed_client.post(
        "/api/v1/match/scores",
        json={"resume_text": "Python, FastAPI, PostgreSQL, AWS engineer with 5y exp."},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["engine"] == "v2"
    assert job["id"] in body["scores"]
    entry = body["scores"][job["id"]]
    assert "score" in entry
    assert "matched_skills" in entry
    assert "missing_skills" in entry


def test_match_scores_legacy_engine_via_use_v2_false(authed_client: TestClient):
    """Caller can opt out of v2 scoring with use_v2=False."""
    _seed_job()
    r = authed_client.post(
        "/api/v1/match/scores",
        json={"resume_text": "Python engineer", "use_v2": False},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["engine"] == "legacy"
    assert isinstance(body["scores"], dict)


def test_match_scores_no_jobs_returns_empty_scores(authed_client: TestClient):
    """No jobs in store → scores dict is empty regardless of resume."""
    r = authed_client.post(
        "/api/v1/match/scores",
        json={"resume_text": "Python and FastAPI"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["engine"] == "v2"
    assert body["scores"] == {}


def test_match_scores_empty_resume_text_still_returns_scores(
    authed_client: TestClient,
):
    """Empty resume_text shouldn't crash — every job still gets an entry."""
    job = _seed_job()
    r = authed_client.post(
        "/api/v1/match/scores",
        json={"resume_text": ""},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["engine"] == "v2"
    # The v2 scorer still returns a (low) score for empty resume_text.
    assert job["id"] in body["scores"]
    entry = body["scores"][job["id"]]
    assert "score" in entry
    # No skills were extracted, so matched_skills is empty.
    assert entry["matched_skills"] == []


def test_match_scores_invalid_body_422(authed_client: TestClient):
    """Body must be a JSON object — sending a list should 422."""
    r = authed_client.post("/api/v1/match/scores", json=["not", "an", "object"])
    assert r.status_code == 422


def test_match_scores_default_engine_is_v2(authed_client: TestClient):
    """When use_v2 is omitted, the router defaults to v2."""
    _seed_job()
    r = authed_client.post(
        "/api/v1/match/scores",
        json={"resume_text": "Python and FastAPI"},
    )
    assert r.status_code == 200
    assert r.json()["engine"] == "v2"
