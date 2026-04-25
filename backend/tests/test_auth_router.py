"""Router tests for app/routers/auth.py.

Covers the /auth/me handler under three regimes:
  1. Supabase NOT configured (CI's default) → returns a friendly demo-mode payload.
  2. Supabase configured + valid HS256 JWT → returns the user id.
  3. Supabase configured + missing/invalid/expired JWT → returns user=None.

Real PyJWT is used to mint test tokens with a known shared secret; no
network calls.
"""
from __future__ import annotations

import os
import sys

# Add the backend dir to sys.path so `app.*` imports resolve when pytest
# is run from `backend/` (matches the pattern in tests/test_eval_service.py).
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
from unittest.mock import patch

import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings
from app.routers import auth as auth_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(auth_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)


@pytest.fixture
def fake_jwt_secret() -> str:
    return "unit-test-jwt-secret-do-not-use-in-prod"


def _supabase_configured_settings(jwt_secret: str) -> Settings:
    """A Settings instance with all three Supabase fields populated."""
    return Settings(
        SUPABASE_URL="https://fake.supabase.co",
        SUPABASE_KEY="fake-service-role-key",
        SUPABASE_JWT_SECRET=jwt_secret,
        ANTHROPIC_API_KEY="test-key",
    )


def _empty_settings() -> Settings:
    """A Settings instance with Supabase fields empty (CI default)."""
    return Settings(
        SUPABASE_URL="",
        SUPABASE_KEY="",
        SUPABASE_JWT_SECRET="",
        ANTHROPIC_API_KEY="test-key",
    )


def _mint_token(
    secret: str,
    *,
    sub: str = "user-123",
    exp_offset: int = 3600,
    audience: str | None = "authenticated",
) -> str:
    payload: dict = {"sub": sub, "exp": int(time.time()) + exp_offset}
    if audience is not None:
        payload["aud"] = audience
    return jwt.encode(payload, secret, algorithm="HS256")


# ── /auth/me — Supabase not configured (demo / local mode) ──────────────────


def test_me_demo_mode_when_supabase_unconfigured(client: TestClient):
    """With empty Supabase envs, /auth/me explains persistence isn't configured."""
    with patch.object(auth_router, "get_settings", return_value=_empty_settings()):
        r = client.get("/api/v1/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None
    assert "persistence" in body["message"].lower()


def test_me_demo_mode_ignores_authorization_header(client: TestClient):
    """Even with an Authorization header, demo mode short-circuits."""
    with patch.object(auth_router, "get_settings", return_value=_empty_settings()):
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer some-token-that-would-be-invalid"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None


# ── /auth/me — Supabase configured, missing token ───────────────────────────


def test_me_no_authorization_header_returns_no_token(
    client: TestClient, fake_jwt_secret: str
):
    cfg = _supabase_configured_settings(fake_jwt_secret)
    with patch.object(auth_router, "get_settings", return_value=cfg):
        r = client.get("/api/v1/auth/me")
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None
    assert body["message"] == "No access token"


def test_me_authorization_header_without_bearer_prefix(
    client: TestClient, fake_jwt_secret: str
):
    cfg = _supabase_configured_settings(fake_jwt_secret)
    with patch.object(auth_router, "get_settings", return_value=cfg):
        r = client.get("/api/v1/auth/me", headers={"Authorization": "raw-token"})
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None
    assert body["message"] == "No access token"


# ── /auth/me — Supabase configured, valid JWT ───────────────────────────────


def test_me_valid_token_returns_user_id(client: TestClient, fake_jwt_secret: str):
    cfg = _supabase_configured_settings(fake_jwt_secret)
    token = _mint_token(fake_jwt_secret, sub="user-abc-123")
    with patch.object(auth_router, "get_settings", return_value=cfg):
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["user"] == {"id": "user-abc-123"}
    assert body["message"] is None


# ── /auth/me — Supabase configured, invalid / expired tokens ────────────────


def test_me_invalid_token_returns_message(client: TestClient, fake_jwt_secret: str):
    cfg = _supabase_configured_settings(fake_jwt_secret)
    with patch.object(auth_router, "get_settings", return_value=cfg):
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer not-a-real-jwt"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None
    assert body["message"] == "Invalid token"


def test_me_token_signed_with_wrong_secret(client: TestClient, fake_jwt_secret: str):
    """Token minted with a DIFFERENT secret than what the server expects."""
    cfg = _supabase_configured_settings(fake_jwt_secret)
    bad_token = _mint_token("totally-different-secret")
    with patch.object(auth_router, "get_settings", return_value=cfg):
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {bad_token}"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None
    assert body["message"] == "Invalid token"


def test_me_expired_token_returns_message(client: TestClient, fake_jwt_secret: str):
    cfg = _supabase_configured_settings(fake_jwt_secret)
    expired = _mint_token(fake_jwt_secret, exp_offset=-60)  # 1 min in the past
    with patch.object(auth_router, "get_settings", return_value=cfg):
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired}"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None
    assert body["message"] == "Token expired"


def test_me_token_missing_sub_is_invalid(client: TestClient, fake_jwt_secret: str):
    """A token whose payload has no `sub` claim must be rejected as invalid."""
    cfg = _supabase_configured_settings(fake_jwt_secret)
    payload = {
        "exp": int(time.time()) + 3600,
        "aud": "authenticated",
        # no "sub"
    }
    token = jwt.encode(payload, fake_jwt_secret, algorithm="HS256")
    with patch.object(auth_router, "get_settings", return_value=cfg):
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None
    assert body["message"] == "Invalid token"


def test_me_token_with_wrong_audience(client: TestClient, fake_jwt_secret: str):
    """The router decoder pins audience to 'authenticated'."""
    cfg = _supabase_configured_settings(fake_jwt_secret)
    bad_aud = _mint_token(fake_jwt_secret, audience="not-authenticated")
    with patch.object(auth_router, "get_settings", return_value=cfg):
        r = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {bad_aud}"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["user"] is None
    assert body["message"] == "Invalid token"
