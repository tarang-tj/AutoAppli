"""Router tests for app/routers/stories.py.

Covers the HTTP boundary for the Story Library CRUD surface.
Supabase is left unconfigured in CI; the service falls back to its
in-memory per-user store so tests are hermetic.

Test matrix:
  - 401 with no auth (Supabase JWT gate active)
  - POST /stories creates and returns the row
  - GET /stories returns the authenticated user's rows only
  - PATCH /stories/{id} partial update works
  - DELETE /stories/{id} succeeds and second attempt 404s
  - 404 on unknown id (patch + delete)
  - Cross-user isolation: user B cannot see user A's stories
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.routers import stories as stories_router
from app.services.stories_service import _mem_store


# ── Helpers ───────────────────────────────────────────────────────────────────

_USER_A = "user-stories-A"
_USER_B = "user-stories-B"


def _make_app(user_id: str | None) -> FastAPI:
    """Spin up a minimal FastAPI app with the stories router and a stubbed auth dep."""
    a = FastAPI()
    a.include_router(stories_router.router, prefix="/api/v1")

    def _fake_user() -> str | None:
        return user_id

    a.dependency_overrides[get_jobs_user_id] = _fake_user
    return a


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _clear_stores():
    """Wipe in-memory stores before and after every test."""
    _mem_store(_USER_A).clear()
    _mem_store(_USER_B).clear()
    yield
    _mem_store(_USER_A).clear()
    _mem_store(_USER_B).clear()


@pytest.fixture
def client_a() -> TestClient:
    return TestClient(_make_app(_USER_A))


@pytest.fixture
def client_b() -> TestClient:
    return TestClient(_make_app(_USER_B))


@pytest.fixture
def unauthed_client() -> TestClient:
    """Client where auth dep returns None and Supabase is considered configured."""
    a = FastAPI()
    a.include_router(stories_router.router, prefix="/api/v1")

    from fastapi import HTTPException as _HTTPException

    def _no_user() -> str | None:
        # Simulate what get_jobs_user_id does when auth header is absent
        # and Supabase IS configured — it raises 401.
        raise _HTTPException(status_code=401, detail="Authorization required")

    a.dependency_overrides[get_jobs_user_id] = _no_user
    return TestClient(a, raise_server_exceptions=False)


def _create_story(
    client: TestClient,
    *,
    title: str = "Led migration to microservices",
    tags: list[str] | None = None,
    situation: str = "Legacy monolith at 10k rps",
    task: str = "Decompose payment service",
    action: str = "Strangler-fig pattern over 6 months",
    result: str = "99.9% uptime, 40% latency reduction",
) -> dict:
    payload = {
        "title": title,
        "tags": tags or ["technical", "leadership"],
        "situation": situation,
        "task": task,
        "action": action,
        "result": result,
    }
    r = client.post("/api/v1/stories", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# ── Auth guard ────────────────────────────────────────────────────────────────


def test_get_stories_requires_auth(unauthed_client: TestClient):
    r = unauthed_client.get("/api/v1/stories")
    assert r.status_code == 401


def test_post_story_requires_auth(unauthed_client: TestClient):
    r = unauthed_client.post(
        "/api/v1/stories",
        json={"title": "Sneaky unauthenticated story"},
    )
    assert r.status_code == 401


# ── POST /stories ─────────────────────────────────────────────────────────────


def test_create_story_happy_path(client_a: TestClient):
    r = client_a.post(
        "/api/v1/stories",
        json={
            "title": "Resolved a cross-team conflict",
            "tags": ["conflict", "communication"],
            "situation": "Two teams disagreed on API contract.",
            "task": "Mediate and ship on time.",
            "action": "Facilitated three design reviews.",
            "result": "Shipped two weeks early.",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["title"] == "Resolved a cross-team conflict"
    assert set(body["tags"]) == {"conflict", "communication"}
    assert body["situation"] == "Two teams disagreed on API contract."
    assert body["task"] == "Mediate and ship on time."
    assert body["action"] == "Facilitated three design reviews."
    assert body["result"] == "Shipped two weeks early."
    assert "id" in body
    assert "created_at" in body
    assert "updated_at" in body
    assert body["user_id"] == _USER_A


def test_create_story_minimal_body(client_a: TestClient):
    """Only title is required; STAR fields default to empty strings."""
    r = client_a.post("/api/v1/stories", json={"title": "Minimal story"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["title"] == "Minimal story"
    assert body["tags"] == []
    assert body["situation"] == ""
    assert body["task"] == ""
    assert body["action"] == ""
    assert body["result"] == ""


def test_create_story_missing_title_returns_422(client_a: TestClient):
    r = client_a.post("/api/v1/stories", json={"tags": ["technical"]})
    assert r.status_code == 422


def test_create_story_invalid_tag_returns_422(client_a: TestClient):
    r = client_a.post(
        "/api/v1/stories",
        json={"title": "Bad tag", "tags": ["not_a_valid_tag"]},
    )
    assert r.status_code == 422


# ── GET /stories ──────────────────────────────────────────────────────────────


def test_list_stories_empty(client_a: TestClient):
    r = client_a.get("/api/v1/stories")
    assert r.status_code == 200
    assert r.json() == []


def test_list_stories_returns_own_rows(client_a: TestClient):
    _create_story(client_a, title="Story Alpha")
    _create_story(client_a, title="Story Beta")
    r = client_a.get("/api/v1/stories")
    assert r.status_code == 200
    titles = [s["title"] for s in r.json()]
    assert "Story Alpha" in titles
    assert "Story Beta" in titles
    assert len(titles) == 2


def test_list_stories_newest_first(client_a: TestClient):
    _create_story(client_a, title="First")
    _create_story(client_a, title="Second")
    rows = client_a.get("/api/v1/stories").json()
    # In-memory store returns reversed (newest first).
    assert rows[0]["title"] == "Second"
    assert rows[1]["title"] == "First"


# ── Cross-user isolation ──────────────────────────────────────────────────────


def test_cross_user_isolation(client_a: TestClient, client_b: TestClient):
    """User B must not see User A's stories."""
    _create_story(client_a, title="User A secret story")

    r_b = client_b.get("/api/v1/stories")
    assert r_b.status_code == 200
    assert r_b.json() == []


def test_cross_user_delete_isolation(client_a: TestClient, client_b: TestClient):
    """User B cannot delete User A's story — gets 404, not 200."""
    story = _create_story(client_a, title="Protected story")
    r = client_b.delete(f"/api/v1/stories/{story['id']}")
    assert r.status_code == 404
    # Story still exists for user A.
    rows_a = client_a.get("/api/v1/stories").json()
    assert any(s["id"] == story["id"] for s in rows_a)


def test_cross_user_patch_isolation(client_a: TestClient, client_b: TestClient):
    """User B cannot update User A's story — gets 404."""
    story = _create_story(client_a, title="Original")
    r = client_b.patch(
        f"/api/v1/stories/{story['id']}",
        json={"title": "Hijacked"},
    )
    assert r.status_code == 404


# ── PATCH /stories/{id} ───────────────────────────────────────────────────────


def test_patch_story_partial_update(client_a: TestClient):
    story = _create_story(client_a, title="Original title")
    r = client_a.patch(
        f"/api/v1/stories/{story['id']}",
        json={"result": "Updated result text"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["result"] == "Updated result text"
    # Untouched fields preserved.
    assert body["title"] == "Original title"


def test_patch_story_updates_tags(client_a: TestClient):
    story = _create_story(client_a, tags=["technical"])
    r = client_a.patch(
        f"/api/v1/stories/{story['id']}",
        json={"tags": ["leadership", "teamwork"]},
    )
    assert r.status_code == 200
    assert set(r.json()["tags"]) == {"leadership", "teamwork"}


def test_patch_story_unknown_id_returns_404(client_a: TestClient):
    r = client_a.patch(
        "/api/v1/stories/00000000-0000-0000-0000-000000000000",
        json={"title": "Ghost update"},
    )
    assert r.status_code == 404


def test_patch_story_empty_body_returns_422(client_a: TestClient):
    story = _create_story(client_a)
    r = client_a.patch(f"/api/v1/stories/{story['id']}", json={})
    assert r.status_code == 422


# ── DELETE /stories/{id} ──────────────────────────────────────────────────────


def test_delete_story_happy_path(client_a: TestClient):
    story = _create_story(client_a, title="To be deleted")
    r = client_a.delete(f"/api/v1/stories/{story['id']}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


def test_delete_story_then_not_in_list(client_a: TestClient):
    story = _create_story(client_a, title="Ephemeral")
    client_a.delete(f"/api/v1/stories/{story['id']}")
    rows = client_a.get("/api/v1/stories").json()
    assert all(s["id"] != story["id"] for s in rows)


def test_delete_story_second_attempt_returns_404(client_a: TestClient):
    story = _create_story(client_a)
    client_a.delete(f"/api/v1/stories/{story['id']}")
    r2 = client_a.delete(f"/api/v1/stories/{story['id']}")
    assert r2.status_code == 404


def test_delete_unknown_id_returns_404(client_a: TestClient):
    r = client_a.delete("/api/v1/stories/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404
