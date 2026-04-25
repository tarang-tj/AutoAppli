"""Router tests for app/routers/automation.py.

Covers the automation rules CRUD surface plus /automation/evaluate and
/automation/stale. The router seeds DEFAULT_RULES into the per-user store
on first access — tests assert that behaviour and exercise toggle/update/
delete on top of it.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories import jobs_memory
from app.repositories.user_session_memory import (
    automation_rules as mem_rules,
    interview_notes as mem_interviews,
)
from app.routers import automation as automation_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(automation_router.router, prefix="/api/v1")
    return a


@pytest.fixture(autouse=True)
def _reset_state():
    jobs_memory._jobs.clear()
    yield
    jobs_memory._jobs.clear()


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-automation-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    mem_rules(fake_user).clear()
    mem_interviews(fake_user).clear()


# ── GET /automation/rules ────────────────────────────────────────────────────


def test_list_rules_seeds_defaults_on_first_call(authed_client: TestClient):
    """First GET initializes the user's rules with the DEFAULT_RULES set."""
    r = authed_client.get("/api/v1/automation/rules")
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) >= 3
    ids = {row["id"] for row in rows}
    # The three default rule ids declared in automation_service.DEFAULT_RULES.
    assert {"rule-auto-apply", "rule-auto-interviewing", "rule-ghost-14d"}.issubset(ids)


def test_list_rules_idempotent(authed_client: TestClient):
    """Calling list twice does not double-seed defaults."""
    first = authed_client.get("/api/v1/automation/rules").json()
    second = authed_client.get("/api/v1/automation/rules").json()
    assert len(first) == len(second)


# ── POST /automation/rules ───────────────────────────────────────────────────


def test_create_rule_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/automation/rules",
        json={
            "name": "Custom rule",
            "trigger": "manual",
            "action": "move_to_status",
            "action_config": {"target_status": "applied"},
            "is_active": True,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["id"].startswith("rule-")
    assert body["name"] == "Custom rule"
    assert body["is_active"] is True


def test_create_rule_empty_body_uses_defaults(authed_client: TestClient):
    """All AutomationRuleCreate fields default → empty dict is acceptable."""
    r = authed_client.post("/api/v1/automation/rules", json={})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["trigger"] == "manual"
    assert body["action"] == "move_to_status"
    assert body["is_active"] is True


# ── PATCH /automation/rules/{id} ─────────────────────────────────────────────


def test_patch_rule_toggle_active(authed_client: TestClient):
    """Flipping is_active to False persists and is reflected in the response."""
    # Trigger seed.
    authed_client.get("/api/v1/automation/rules")
    r = authed_client.patch(
        "/api/v1/automation/rules/rule-auto-apply",
        json={"is_active": False},
    )
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is False


def test_patch_rule_unknown_id_404(authed_client: TestClient):
    r = authed_client.patch(
        "/api/v1/automation/rules/rule-doesnotexist",
        json={"is_active": False},
    )
    assert r.status_code == 404


def test_patch_rule_partial_update_preserves_other_fields(
    authed_client: TestClient,
):
    """Updating only `name` keeps trigger/action untouched."""
    authed_client.get("/api/v1/automation/rules")
    r = authed_client.patch(
        "/api/v1/automation/rules/rule-auto-apply",
        json={"name": "Renamed"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Renamed"
    # Original trigger from DEFAULT_RULES remains.
    assert body["trigger"] == "application_sent"


# ── DELETE /automation/rules/{id} ────────────────────────────────────────────


def test_delete_rule_happy_then_404(authed_client: TestClient):
    authed_client.get("/api/v1/automation/rules")
    r = authed_client.delete("/api/v1/automation/rules/rule-auto-apply")
    assert r.status_code == 200
    assert r.json() == {"id": "rule-auto-apply", "deleted": True}

    # Re-deleting now 404s.
    r2 = authed_client.delete("/api/v1/automation/rules/rule-auto-apply")
    assert r2.status_code == 404


def test_delete_rule_unknown_id_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/automation/rules/rule-nope")
    assert r.status_code == 404


# ── POST /automation/evaluate ────────────────────────────────────────────────


def test_evaluate_returns_suggestions_dict(authed_client: TestClient):
    """No qualifying jobs → empty suggestions list, but shape is consistent."""
    r = authed_client.post("/api/v1/automation/evaluate")
    assert r.status_code == 200, r.text
    body = r.json()
    assert "suggestions" in body
    assert isinstance(body["suggestions"], list)


def test_evaluate_suggests_applied_for_bookmarked_with_applied_at(
    authed_client: TestClient,
):
    """A job in 'bookmarked' with applied_at set → application_sent rule fires."""
    job = jobs_memory.create_job(
        "Acme", "BE", "https://acme.example/123", "JD", "manual"
    )
    # Force applied_at on a bookmarked job (without changing the status).
    jobs_memory._jobs[job["id"]]["applied_at"] = "2026-01-01T00:00:00+00:00"

    r = authed_client.post("/api/v1/automation/evaluate")
    assert r.status_code == 200
    suggestions = r.json()["suggestions"]
    assert any(
        s.get("rule_id") == "rule-auto-apply" and s.get("job_id") == job["id"]
        for s in suggestions
    )


# ── GET /automation/stale ────────────────────────────────────────────────────


def test_stale_endpoint_default_days(authed_client: TestClient):
    """No old jobs → stale list is empty; days reflects the default 14."""
    jobs_memory.create_job("Acme", "BE", "https://acme.example/1", "JD", "manual")

    r = authed_client.get("/api/v1/automation/stale")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["days"] == 14
    assert body["stale_jobs"] == []


def test_stale_endpoint_custom_days_query(authed_client: TestClient):
    """The `days` query param is echoed back and used for the threshold."""
    r = authed_client.get("/api/v1/automation/stale?days=30")
    assert r.status_code == 200
    assert r.json()["days"] == 30
