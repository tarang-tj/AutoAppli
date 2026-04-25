"""Router tests for app/routers/search.py.

Three endpoints:
  POST /search             — runs `live_search_service.live_search`,
                             optionally persists the run.
  GET  /search/history     — last N search rows for the user.
  GET  /search/runs/{id}/results — replay a saved search.

In CI Supabase is unconfigured, so the persistence side-effects are
disabled — the router still returns a 200 response with `persisted: false`.
We mock `live_search_service.live_search` at the call site so no scraper
or HTTP traffic happens.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import patch, AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.deps.jobs_auth import get_optional_user_id
from app.middleware.rate_limit import limiter
from app.models.schemas import JobSearchResult
from app.routers import search as search_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    """Minimal app + SlowAPI hookup so the rate-limit decorator can run.

    The /search route is `@limiter.limit("20/minute")` — without
    `app.state.limiter` the decorator raises at request time. Each test
    fires at most 1-2 requests so we stay well under 20/min without
    needing to reset the limiter between cases.
    """
    a = FastAPI()
    a.state.limiter = limiter
    a.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    a.add_middleware(SlowAPIMiddleware)
    a.include_router(search_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    """Override the optional-user dep to return a fake id, simulating a
    logged-in user. The router still falls back to the no-Supabase path
    because envs are empty in CI."""
    fake_user = "user-search-test"
    app.dependency_overrides[get_optional_user_id] = lambda: fake_user
    yield TestClient(app)
    app.dependency_overrides.clear()


def _result(i: int) -> JobSearchResult:
    return JobSearchResult(
        title=f"Backend Engineer #{i}",
        company=f"Acme-{i}",
        location="Remote (US)",
        url=f"https://example.test/jobs/{i}",
        description_snippet="Python, FastAPI, PostgreSQL.",
        posted_date="2026-04-22T12:00:00Z",
        salary=None,
        source="cached",
    )


# ── POST /search ─────────────────────────────────────────────────────────────


def test_search_happy_path(client: TestClient):
    """live_search returns a list of JobSearchResult; router maps each
    to the wire format (description_snippet → snippet)."""
    fake_results = [_result(1), _result(2)]
    with patch(
        "app.routers.search.live_search_service.live_search",
        new=AsyncMock(return_value=fake_results),
    ):
        r = client.post(
            "/api/v1/search",
            json={"query": "backend engineer", "per_page": 10},
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["results"]) == 2
    # The router renames description_snippet → snippet on the wire.
    assert body["results"][0]["snippet"] == "Python, FastAPI, PostgreSQL."
    # Without Supabase, persistence is off.
    assert body["persisted"] is False
    assert body["search_id"] is None


def test_search_empty_results(client: TestClient):
    """Live search returning 0 hits is a valid 200 with empty results."""
    with patch(
        "app.routers.search.live_search_service.live_search",
        new=AsyncMock(return_value=[]),
    ):
        r = client.post(
            "/api/v1/search",
            json={"query": "extremely-niche-role-xyz"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["results"] == []
    assert body["persisted"] is False


def test_search_missing_query_field_422(client: TestClient):
    """SearchRequest requires `query`."""
    r = client.post("/api/v1/search", json={})
    assert r.status_code == 422


def test_search_invalid_per_page_422(client: TestClient):
    """per_page is bounded 1..50 — 100 should fail validation."""
    r = client.post(
        "/api/v1/search",
        json={"query": "backend", "per_page": 100},
    )
    assert r.status_code == 422


def test_search_passes_filters_through_to_service(client: TestClient):
    """Verify location and remote_only flow into the underlying service."""
    capture: dict = {}

    async def _fake(*args, **kwargs):
        capture.update(kwargs)
        return []

    with patch(
        "app.routers.search.live_search_service.live_search",
        new=_fake,
    ):
        r = client.post(
            "/api/v1/search",
            json={
                "query": "backend",
                "location": "New York, NY",
                "remote_only": True,
                "page": 2,
                "per_page": 25,
            },
        )
    assert r.status_code == 200
    assert capture["query"] == "backend"
    assert capture["location"] == "New York, NY"
    assert capture["remote_only"] is True
    assert capture["page"] == 2
    assert capture["per_page"] == 25


# ── GET /search/history ──────────────────────────────────────────────────────


def test_history_returns_empty_without_supabase(authed_client: TestClient):
    """No Supabase → router always returns []."""
    r = authed_client.get("/api/v1/search/history")
    assert r.status_code == 200
    assert r.json() == []


def test_history_returns_empty_when_unauthenticated(client: TestClient):
    """Without a user_id (no auth header in CI default), history is []."""
    r = client.get("/api/v1/search/history?limit=5")
    assert r.status_code == 200
    assert r.json() == []


def test_history_invalid_limit_422(client: TestClient):
    """Query param `limit` is bounded 1..50."""
    r = client.get("/api/v1/search/history?limit=999")
    assert r.status_code == 422


# ── GET /search/runs/{id}/results ────────────────────────────────────────────


def test_replay_returns_404_without_supabase(authed_client: TestClient):
    """Replay endpoint requires Supabase + user_id; without it → 404."""
    r = authed_client.get("/api/v1/search/runs/some-search-id/results")
    assert r.status_code == 404


def test_replay_returns_404_when_unauthenticated(client: TestClient):
    """No user → 404 (the router doesn't expose unauth replay)."""
    r = client.get("/api/v1/search/runs/some-search-id/results")
    assert r.status_code == 404
