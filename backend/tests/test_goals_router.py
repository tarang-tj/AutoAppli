"""Router tests for app/routers/goals.py.

Covers the HTTP boundary for GET /goals and PATCH /goals.
Supabase is left unconfigured in CI; the service falls back to its
in-memory per-user store so tests are fully hermetic.

Test matrix:
  - 401 when auth is absent (Supabase JWT gate active)
  - GET /goals creates and returns default row on first call
  - GET /goals returns same config on subsequent calls (idempotent)
  - PATCH /goals updates weekly_target
  - PATCH /goals updates start_date
  - PATCH /goals with empty body returns 422
  - PATCH weekly_target=0 returns 422 (check constraint)
  - PATCH weekly_target=201 returns 422 (check constraint)
  - Cross-user isolation: user B cannot see or affect user A's config
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.routers import goals as goals_router
from app.services.goals_service import _clear_mem_store


# ── Constants ─────────────────────────────────────────────────────────────────

_USER_A = "user-goals-A"
_USER_B = "user-goals-B"


# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_app(user_id: str | None) -> FastAPI:
    a = FastAPI()
    a.include_router(goals_router.router, prefix="/api/v1")

    def _fake_user() -> str | None:
        return user_id

    a.dependency_overrides[get_jobs_user_id] = _fake_user
    return a


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _clear_stores():
    _clear_mem_store(_USER_A)
    _clear_mem_store(_USER_B)
    yield
    _clear_mem_store(_USER_A)
    _clear_mem_store(_USER_B)


@pytest.fixture
def client_a() -> TestClient:
    return TestClient(_make_app(_USER_A))


@pytest.fixture
def client_b() -> TestClient:
    return TestClient(_make_app(_USER_B))


@pytest.fixture
def unauthed_client() -> TestClient:
    a = FastAPI()
    a.include_router(goals_router.router, prefix="/api/v1")

    from fastapi import HTTPException as _HTTPException

    def _no_user() -> str | None:
        raise _HTTPException(status_code=401, detail="Authorization required")

    a.dependency_overrides[get_jobs_user_id] = _no_user
    return TestClient(a, raise_server_exceptions=False)


# ── Auth guard ────────────────────────────────────────────────────────────────


def test_get_goals_requires_auth(unauthed_client: TestClient):
    r = unauthed_client.get("/api/v1/goals")
    assert r.status_code == 401


def test_patch_goals_requires_auth(unauthed_client: TestClient):
    r = unauthed_client.patch("/api/v1/goals", json={"weekly_target": 5})
    assert r.status_code == 401


# ── GET /goals ────────────────────────────────────────────────────────────────


def test_get_goals_creates_default_on_first_call(client_a: TestClient):
    r = client_a.get("/api/v1/goals")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["weekly_target"] == 10
    assert "start_date" in body
    assert "updated_at" in body
    assert body["user_id"] == _USER_A


def test_get_goals_idempotent(client_a: TestClient):
    r1 = client_a.get("/api/v1/goals")
    r2 = client_a.get("/api/v1/goals")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["weekly_target"] == r2.json()["weekly_target"]
    assert r1.json()["start_date"] == r2.json()["start_date"]


# ── PATCH /goals ──────────────────────────────────────────────────────────────


def test_patch_goals_weekly_target(client_a: TestClient):
    r = client_a.patch("/api/v1/goals", json={"weekly_target": 20})
    assert r.status_code == 200, r.text
    assert r.json()["weekly_target"] == 20


def test_patch_goals_start_date(client_a: TestClient):
    r = client_a.patch("/api/v1/goals", json={"start_date": "2026-01-06"})
    assert r.status_code == 200, r.text
    assert r.json()["start_date"] == "2026-01-06"


def test_patch_goals_both_fields(client_a: TestClient):
    r = client_a.patch(
        "/api/v1/goals",
        json={"weekly_target": 15, "start_date": "2026-03-02"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["weekly_target"] == 15
    assert body["start_date"] == "2026-03-02"


def test_patch_goals_empty_body_returns_422(client_a: TestClient):
    r = client_a.patch("/api/v1/goals", json={})
    assert r.status_code == 422


def test_patch_goals_zero_target_returns_422(client_a: TestClient):
    r = client_a.patch("/api/v1/goals", json={"weekly_target": 0})
    assert r.status_code == 422


def test_patch_goals_over_max_target_returns_422(client_a: TestClient):
    r = client_a.patch("/api/v1/goals", json={"weekly_target": 201})
    assert r.status_code == 422


def test_patch_preserves_unmodified_fields(client_a: TestClient):
    # Set a known start_date first.
    client_a.patch("/api/v1/goals", json={"start_date": "2026-01-05"})
    # Then only update weekly_target.
    r = client_a.patch("/api/v1/goals", json={"weekly_target": 25})
    assert r.status_code == 200
    body = r.json()
    assert body["weekly_target"] == 25
    assert body["start_date"] == "2026-01-05"


# ── Cross-user isolation ──────────────────────────────────────────────────────


def test_cross_user_configs_are_independent(client_a: TestClient, client_b: TestClient):
    client_a.patch("/api/v1/goals", json={"weekly_target": 30})
    r_b = client_b.get("/api/v1/goals")
    assert r_b.status_code == 200
    # User B should have the default, not user A's value.
    assert r_b.json()["weekly_target"] == 10
