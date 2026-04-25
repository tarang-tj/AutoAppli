"""Router tests for app/routers/notifications.py.

Reminders surface — manual CRUD plus auto-generated reminders. The
list endpoint scans the user's jobs + interview notes to derive auto
reminders; we drive that path by seeding the in-memory stores directly.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import (
    interview_notes as mem_interviews,
    job_store as mem_jobs,
    reminders as mem_reminders,
)
from app.routers import notifications as notifications_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(notifications_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-notifications-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    mem_reminders(fake_user).clear()
    mem_interviews(fake_user).clear()
    mem_jobs(fake_user).clear()


# ── POST /notifications/reminders ────────────────────────────────────────────


def test_create_reminder_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/notifications/reminders",
        json={
            "job_id": "job-1",
            "reminder_type": "follow_up_application",
            "title": "Follow up with Acme",
            "message": "Send a polite check-in.",
            "due_at": "2026-05-01T09:00:00+00:00",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["id"].startswith("rem-")
    assert body["job_id"] == "job-1"
    assert body["title"] == "Follow up with Acme"
    assert body["is_read"] is False
    assert body["is_dismissed"] is False


def test_create_reminder_empty_body_uses_defaults(authed_client: TestClient):
    """All ReminderCreate fields default; an empty {} is acceptable."""
    r = authed_client.post("/api/v1/notifications/reminders", json={})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["reminder_type"] == "custom"
    # The service maps "custom" → "Custom Reminder" when title is empty.
    assert body["title"] == "Custom Reminder"


# ── GET /notifications/reminders ─────────────────────────────────────────────


def test_list_reminders_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/notifications/reminders")
    assert r.status_code == 200
    assert r.json() == []


def test_list_reminders_includes_manual(authed_client: TestClient):
    """A manual reminder is returned alongside (any) auto-generated ones."""
    created = authed_client.post(
        "/api/v1/notifications/reminders",
        json={"title": "Manual one", "message": "Do this"},
    ).json()

    r = authed_client.get("/api/v1/notifications/reminders")
    assert r.status_code == 200
    rows = r.json()
    assert any(row["id"] == created["id"] for row in rows)


def test_list_reminders_include_auto_false_returns_only_manual(
    authed_client: TestClient,
):
    """include_auto=false short-circuits before generate_auto_reminders."""
    authed_client.post(
        "/api/v1/notifications/reminders",
        json={"title": "Manual", "message": "x"},
    )
    r = authed_client.get(
        "/api/v1/notifications/reminders", params={"include_auto": "false"}
    )
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["title"] == "Manual"


def test_list_reminders_auto_includes_old_application(authed_client: TestClient):
    """A job applied >7d ago should produce an auto follow-up reminder."""
    fake_user = "user-notifications-test"
    # Seed a job in 'applied' status with applied_at older than 7 days.
    old = (datetime.now(timezone.utc) - timedelta(days=10)).isoformat()
    mem_jobs(fake_user)["job-old"] = {
        "id": "job-old",
        "company": "Acme",
        "title": "Backend Engineer",
        "status": "applied",
        "applied_at": old,
        "updated_at": old,
        "notes": "",
    }

    r = authed_client.get("/api/v1/notifications/reminders")
    assert r.status_code == 200
    rows = r.json()
    assert any(
        row.get("reminder_type") == "follow_up_application" for row in rows
    )


# ── PATCH /notifications/reminders/{id} ──────────────────────────────────────


def test_patch_reminder_happy_path(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/notifications/reminders", json={"title": "old"}
    ).json()
    r = authed_client.patch(
        f"/api/v1/notifications/reminders/{created['id']}",
        json={"title": "new", "is_read": True},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["title"] == "new"
    assert body["is_read"] is True


def test_patch_reminder_unknown_id_404(authed_client: TestClient):
    r = authed_client.patch(
        "/api/v1/notifications/reminders/rem-nope", json={"title": "x"}
    )
    assert r.status_code == 404


# ── DELETE /notifications/reminders/{id} ─────────────────────────────────────


def test_delete_reminder_happy_then_404(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/notifications/reminders", json={"title": "del"}
    ).json()

    r = authed_client.delete(f"/api/v1/notifications/reminders/{created['id']}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    r2 = authed_client.delete(f"/api/v1/notifications/reminders/{created['id']}")
    assert r2.status_code == 404


def test_delete_reminder_unknown_id_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/notifications/reminders/rem-nope")
    assert r.status_code == 404


# ── POST /notifications/reminders/{id}/read & /dismiss ───────────────────────


def test_mark_read_happy_path(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/notifications/reminders", json={"title": "x"}
    ).json()
    r = authed_client.post(
        f"/api/v1/notifications/reminders/{created['id']}/read"
    )
    assert r.status_code == 200
    assert r.json()["is_read"] is True


def test_mark_read_unknown_id_404(authed_client: TestClient):
    r = authed_client.post("/api/v1/notifications/reminders/rem-nope/read")
    assert r.status_code == 404


def test_dismiss_reminder_happy_path(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/notifications/reminders", json={"title": "x"}
    ).json()
    r = authed_client.post(
        f"/api/v1/notifications/reminders/{created['id']}/dismiss"
    )
    assert r.status_code == 200
    assert r.json()["is_dismissed"] is True
