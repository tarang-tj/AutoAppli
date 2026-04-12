"""Tests for notification_service — reminder creation and auto-generation."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta

from app.services.notification_service import (
    generate_auto_reminders,
    make_reminder,
    REMINDER_TYPES,
)


# ── make_reminder ─────────────────────────────────────────────────


def test_reminder_has_required_fields():
    rem = make_reminder(title="Test", message="Hello")
    assert rem["id"].startswith("rem-")
    assert rem["title"] == "Test"
    assert rem["message"] == "Hello"
    assert rem["is_read"] is False
    assert rem["is_dismissed"] is False
    assert rem["reminder_type"] == "custom"


def test_reminder_custom_fields():
    rem = make_reminder(
        job_id="job-1",
        reminder_type="offer_deadline",
        title="Offer deadline",
        message="Respond soon!",
        due_at="2026-04-15T10:00:00Z",
    )
    assert rem["job_id"] == "job-1"
    assert rem["reminder_type"] == "offer_deadline"
    assert rem["due_at"] == "2026-04-15T10:00:00Z"


def test_reminder_unique_ids():
    r1 = make_reminder(title="A")
    r2 = make_reminder(title="B")
    assert r1["id"] != r2["id"]


def test_reminder_default_title():
    rem = make_reminder(reminder_type="interview_upcoming")
    assert rem["title"] == REMINDER_TYPES["interview_upcoming"]


# ── generate_auto_reminders ───────────────────────────────────────

def _make_job(job_id="job-1", status="applied", applied_days_ago=10, company="Acme", title="Engineer", notes=""):
    now = datetime.now(timezone.utc)
    applied_at = (now - timedelta(days=applied_days_ago)).isoformat()
    return {
        "id": job_id,
        "status": status,
        "company": company,
        "title": title,
        "applied_at": applied_at,
        "updated_at": applied_at,
        "notes": notes,
        "created_at": (now - timedelta(days=applied_days_ago + 5)).isoformat(),
    }


def _make_interview(status="upcoming", hours_from_now=24, job_id="job-1", round_name="Phone Screen"):
    now = datetime.now(timezone.utc)
    scheduled_at = (now + timedelta(hours=hours_from_now)).isoformat()
    return {
        "id": "int-1",
        "job_id": job_id,
        "status": status,
        "round_name": round_name,
        "scheduled_at": scheduled_at,
        "interviewer_name": "Jane",
        "notes": "",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }


def test_auto_reminders_interview_upcoming():
    interviews = [_make_interview(hours_from_now=20)]
    reminders = generate_auto_reminders([], interviews)
    types = [r["reminder_type"] for r in reminders]
    assert "interview_upcoming" in types


def test_auto_reminders_no_interview_far_away():
    interviews = [_make_interview(hours_from_now=72)]
    reminders = generate_auto_reminders([], interviews)
    types = [r["reminder_type"] for r in reminders]
    assert "interview_upcoming" not in types


def test_auto_reminders_follow_up_application():
    jobs = [_make_job(applied_days_ago=10)]
    reminders = generate_auto_reminders(jobs, [])
    types = [r["reminder_type"] for r in reminders]
    assert "follow_up_application" in types


def test_auto_reminders_no_follow_up_recent():
    jobs = [_make_job(applied_days_ago=3)]
    reminders = generate_auto_reminders(jobs, [])
    types = [r["reminder_type"] for r in reminders]
    assert "follow_up_application" not in types


def test_auto_reminders_offer_deadline():
    jobs = [_make_job(status="offer", notes="Decision deadline next Friday")]
    reminders = generate_auto_reminders(jobs, [])
    types = [r["reminder_type"] for r in reminders]
    assert "offer_deadline" in types


def test_auto_reminders_post_interview_follow_up():
    now = datetime.now(timezone.utc)
    interviews = [{
        "id": "int-2",
        "job_id": "job-1",
        "status": "completed",
        "round_name": "Technical",
        "scheduled_at": (now - timedelta(days=3)).isoformat(),
        "interviewer_name": "",
        "notes": "",
        "created_at": (now - timedelta(days=5)).isoformat(),
        "updated_at": (now - timedelta(days=3)).isoformat(),
    }]
    reminders = generate_auto_reminders([], interviews)
    types = [r["reminder_type"] for r in reminders]
    assert "follow_up_interview" in types
