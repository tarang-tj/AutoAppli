"""Router tests for app/routers/profile.py.

The router has two endpoints (GET and PATCH /profile). With Supabase
unconfigured (CI default) the router short-circuits both endpoints
without ever touching the database — GET returns a default
ProfileResponse and PATCH returns the patched fields echoed back. That
matches CI's expectations.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.routers import profile as profile_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(profile_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-profile-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()


# ── GET /profile ─────────────────────────────────────────────────────────────


def test_get_profile_returns_defaults_without_supabase(authed_client: TestClient):
    """With Supabase unconfigured the router returns a default profile shape."""
    r = authed_client.get("/api/v1/profile")
    assert r.status_code == 200
    body = r.json()
    # Default values come from the ProfileResponse schema.
    assert body["display_name"] == ""
    assert body["headline"] == ""
    assert body["linkedin_url"] == ""
    assert body["phone"] == ""
    assert body["location"] == ""
    assert body["portfolio_url"] == ""
    assert body["bio"] == ""
    assert body["remote_preference"] == "any"
    assert body["updated_at"] is None


# ── PATCH /profile ───────────────────────────────────────────────────────────


def test_patch_profile_echoes_fields_without_supabase(authed_client: TestClient):
    """Without persistence the PATCH path trims and echoes display_name,
    headline, and linkedin_url. Other fields fall back to schema defaults.
    """
    r = authed_client.patch(
        "/api/v1/profile",
        json={
            "display_name": "  Jane Doe  ",
            "headline": "Senior Backend Engineer",
            "linkedin_url": "https://linkedin.com/in/jane",
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["display_name"] == "Jane Doe"  # whitespace trimmed
    assert body["headline"] == "Senior Backend Engineer"
    assert body["linkedin_url"] == "https://linkedin.com/in/jane"


def test_patch_profile_partial_update(authed_client: TestClient):
    """Sending only one field works — other fields use defaults from schema."""
    r = authed_client.patch(
        "/api/v1/profile",
        json={"headline": "Software Engineer"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["headline"] == "Software Engineer"
    # Untouched display_name / linkedin_url default to "".
    assert body["display_name"] == ""
    assert body["linkedin_url"] == ""


def test_patch_profile_invalid_remote_preference_422(authed_client: TestClient):
    """remote_preference is a Literal — random strings should fail validation."""
    r = authed_client.patch(
        "/api/v1/profile",
        json={"remote_preference": "telepathic"},
    )
    assert r.status_code == 422


def test_patch_profile_extra_field_forbidden_422(authed_client: TestClient):
    """ProfilePatch sets extra='forbid' — unknown fields should 422."""
    r = authed_client.patch(
        "/api/v1/profile",
        json={"display_name": "Jane", "shoe_size": 11},
    )
    assert r.status_code == 422


def test_patch_profile_truncates_long_display_name(authed_client: TestClient):
    """The router caps display_name at 200 chars when persistence is off."""
    long_name = "A" * 500
    r = authed_client.patch(
        "/api/v1/profile",
        json={"display_name": long_name},
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["display_name"]) == 200


def test_patch_profile_empty_body_returns_defaults(authed_client: TestClient):
    """Empty PATCH body returns the schema-default profile shape."""
    r = authed_client.patch("/api/v1/profile", json={})
    assert r.status_code == 200
    body = r.json()
    # No fields supplied → trim of None gives "" everywhere.
    assert body["display_name"] == ""
    assert body["headline"] == ""
