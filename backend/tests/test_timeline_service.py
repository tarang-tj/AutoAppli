"""Tests for timeline_service — event creation and timeline building."""
from __future__ import annotations

from app.services.timeline_service import (
    make_timeline_event,
    build_job_timeline,
    EVENT_TYPE_LABELS,
)


# ── make_timeline_event ───────────────────────────────────────────

def test_event_has_required_fields():
    evt = make_timeline_event(job_id="job-1", title="Applied")
    assert evt["id"].startswith("evt-")
    assert evt["job_id"] == "job-1"
    assert evt["title"] == "Applied"
    assert evt["event_type"] == "note"


def test_event_custom_fields():
    evt = make_timeline_event(
        job_id="job-2",
        event_type="custom",
        title="Follow-up call",
        description="Discussed next steps",
        occurred_at="2026-04-10T15:00:00Z",
    )
    assert evt["event_type"] == "custom"
    assert evt["occurred_at"] == "2026-04-10T15:00:00Z"


def test_event_unique_ids():
    e1 = make_timeline_event(job_id="j1", title="A")
    e2 = make_timeline_event(job_id="j1", title="B")
    assert e1["id"] != e2["id"]


# ── build_job_timeline ────────────────────────────────────────────

def _make_job(job_id="job-1", status="applied", company="Acme", title="Engineer"):
    return {
        "id": job_id,
        "status": status,
        "company": company,
        "title": title,
        "source": "linkedin",
        "created_at": "2026-04-01T10:00:00Z",
        "applied_at": "2026-04-03T10:00:00Z" if status != "bookmarked" else None,
        "updated_at": "2026-04-05T10:00:00Z",
        "notes": "Test notes",
    }


def test_timeline_includes_created():
    job = _make_job(status="bookmarked")
    events = build_job_timeline(job, [], [], [], [])
    types = [e["event_type"] for e in events]
    assert "status_change" in types
    titles = [e["title"] for e in events]
    assert any("bookmarked" in t.lower() for t in titles)


def test_timeline_includes_applied():
    job = _make_job(status="applied")
    events = build_job_timeline(job, [], [], [], [])
    types = [e["event_type"] for e in events]
    assert "application_sent" in types


def test_timeline_includes_interviews():
    job = _make_job()
    interviews = [{
        "id": "int-1",
        "job_id": "job-1",
        "status": "upcoming",
        "round_name": "Phone Screen",
        "scheduled_at": "2026-04-06T14:00:00Z",
        "interviewer_name": "Jane",
        "notes": "Prep needed",
        "created_at": "2026-04-04T10:00:00Z",
    }]
    events = build_job_timeline(job, interviews, [], [], [])
    types = [e["event_type"] for e in events]
    assert "interview_scheduled" in types


def test_timeline_includes_contacts():
    job = _make_job()
    contacts = [{
        "id": "ct-1",
        "job_id": "job-1",
        "name": "Sarah",
        "role": "Recruiter",
        "relationship": "recruiter",
        "created_at": "2026-04-02T10:00:00Z",
    }]
    events = build_job_timeline(job, [], [], contacts, [])
    types = [e["event_type"] for e in events]
    assert "contact_added" in types


def test_timeline_includes_manual_events():
    job = _make_job()
    manual = [make_timeline_event(job_id="job-1", title="Custom note")]
    events = build_job_timeline(job, [], [], [], manual)
    titles = [e["title"] for e in events]
    assert "Custom note" in titles


def test_timeline_sorted_reverse_chronological():
    job = _make_job()
    events = build_job_timeline(job, [], [], [], [])
    dates = [e["occurred_at"] for e in events if e["occurred_at"]]
    assert dates == sorted(dates, reverse=True)


def test_timeline_offer_status():
    job = _make_job(status="offer")
    events = build_job_timeline(job, [], [], [], [])
    types = [e["event_type"] for e in events]
    assert "offer_received" in types


def test_timeline_ignores_other_job_interviews():
    job = _make_job(job_id="job-1")
    interviews = [{
        "id": "int-99",
        "job_id": "job-99",
        "status": "upcoming",
        "round_name": "Other",
        "scheduled_at": "2026-04-06T14:00:00Z",
        "interviewer_name": "",
        "notes": "",
        "created_at": "2026-04-04T10:00:00Z",
    }]
    events = build_job_timeline(job, interviews, [], [], [])
    assert not any(e.get("title") == "Other" for e in events)
