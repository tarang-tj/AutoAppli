"""Router tests for app/routers/analytics.py.

Pure-computation router (no AI). Single endpoint: GET /analytics, which
collects all of the user's jobs and delegates to compute_analytics().
Supabase is left unconfigured in CI, so jobs come from `jobs_memory` —
the autouse fixture clears it between tests for isolation.
"""
from __future__ import annotations

import os
import sys

# Match the sys.path pattern used by the rest of the suite.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories import jobs_memory
from app.routers import analytics as analytics_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(analytics_router.router, prefix="/api/v1")
    return a


@pytest.fixture(autouse=True)
def _reset_jobs_memory():
    jobs_memory._jobs.clear()
    yield
    jobs_memory._jobs.clear()


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-analytics-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()


def _seed_job(**overrides) -> dict:
    """Create a single job in the in-memory store and return it."""
    defaults = dict(
        company="Acme",
        title="Backend Engineer",
        url="https://acme.example/jobs/abc",
        description="Build APIs.",
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


# ── GET /analytics ───────────────────────────────────────────────────────────


def test_analytics_empty_pipeline(authed_client: TestClient):
    """No jobs → all counts are zero / defaults."""
    r = authed_client.get("/api/v1/analytics")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total_jobs"] == 0
    assert body["response_rate"] == 0.0
    # funnel is a list of stages, all with count=0
    assert isinstance(body["funnel"], list) and all(
        stage["count"] == 0 for stage in body["funnel"]
    )
    assert body["summary"]["offers"] == 0
    assert body["summary"]["interviews_in_progress"] == 0


def test_analytics_returns_expected_keys(authed_client: TestClient):
    """Smoke check: the payload has the fields the frontend expects."""
    _seed_job()
    r = authed_client.get("/api/v1/analytics")
    assert r.status_code == 200
    body = r.json()
    expected_keys = {
        "total_jobs",
        "funnel",
        "conversions",
        "avg_durations_days",
        "sources",
        "weekly_activity",
        "top_companies",
        "response_rate",
        "summary",
    }
    assert expected_keys.issubset(body.keys())


def test_analytics_total_jobs_count(authed_client: TestClient):
    """total_jobs reflects how many jobs the user owns."""
    _seed_job(company="A", url="https://a.example/1")
    _seed_job(company="B", url="https://b.example/2")
    _seed_job(company="C", url="https://c.example/3")
    r = authed_client.get("/api/v1/analytics")
    assert r.status_code == 200
    assert r.json()["total_jobs"] == 3


def test_analytics_funnel_counts_by_status(authed_client: TestClient):
    """Funnel buckets jobs by status, in pipeline order."""
    a = _seed_job(url="https://x.example/1")
    b = _seed_job(url="https://x.example/2")
    jobs_memory.patch_job(a["id"], {"status": "applied"})
    jobs_memory.patch_job(b["id"], {"status": "applied"})

    r = authed_client.get("/api/v1/analytics")
    body = r.json()
    funnel = {entry["stage"]: entry["count"] for entry in body["funnel"]}
    assert funnel["bookmarked"] == 0
    assert funnel["applied"] == 2


def test_analytics_top_companies_includes_seeded(authed_client: TestClient):
    """top_companies surfaces companies with at least one job, sorted by count."""
    _seed_job(company="Acme", url="https://x.example/1")
    _seed_job(company="Acme", url="https://x.example/2")
    _seed_job(company="Initech", url="https://x.example/3")

    r = authed_client.get("/api/v1/analytics")
    body = r.json()
    companies = {row["company"]: row["count"] for row in body["top_companies"]}
    assert companies.get("Acme") == 2
    assert companies.get("Initech") == 1
    # Acme should rank first.
    assert body["top_companies"][0]["company"] == "Acme"


def test_analytics_summary_offer_count(authed_client: TestClient):
    """summary.offers tracks the offer column count."""
    a = _seed_job(url="https://x.example/1")
    jobs_memory.patch_job(a["id"], {"status": "applied"})
    jobs_memory.patch_job(a["id"], {"status": "offer"})

    r = authed_client.get("/api/v1/analytics")
    body = r.json()
    assert body["summary"]["offers"] == 1


def test_analytics_response_rate_computation(authed_client: TestClient):
    """response_rate = jobs in (interviewing/offer/rejected) / applied_total."""
    # Two applied jobs, one of which advanced to interviewing.
    a = _seed_job(url="https://x.example/1")
    b = _seed_job(url="https://x.example/2")
    jobs_memory.patch_job(a["id"], {"status": "applied"})
    jobs_memory.patch_job(b["id"], {"status": "applied"})
    jobs_memory.patch_job(b["id"], {"status": "interviewing"})

    r = authed_client.get("/api/v1/analytics")
    body = r.json()
    # 1 responded / 2 applied_total = 50.0%
    assert body["response_rate"] == 50.0
