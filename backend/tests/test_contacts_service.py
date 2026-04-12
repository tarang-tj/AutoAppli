"""Tests for contacts_service — contact creation and interaction logging."""
from __future__ import annotations

from app.services.contacts_service import make_contact, add_interaction


def test_contact_has_required_fields():
    c = make_contact(name="Sarah Kim")
    assert c["id"].startswith("contact-")
    assert c["name"] == "Sarah Kim"
    assert c["relationship"] == "recruiter"
    assert c["email"] == ""
    assert c["notes"] == ""


def test_contact_custom_fields():
    c = make_contact(
        name="Marcus Rivera",
        role="Hiring Manager",
        company="Airbnb",
        email="marcus@airbnb.com",
        phone="555-0123",
        linkedin_url="https://linkedin.com/in/marcus",
        relationship="hiring_manager",
        job_id="job-8",
        notes="Met at final round",
    )
    assert c["company"] == "Airbnb"
    assert c["relationship"] == "hiring_manager"
    assert c["job_id"] == "job-8"
    assert c["phone"] == "555-0123"


def test_contact_unique_ids():
    c1 = make_contact(name="A")
    c2 = make_contact(name="B")
    assert c1["id"] != c2["id"]


def test_interaction_creation():
    ix = add_interaction(
        contact_id="contact-1",
        interaction_type="email",
        summary="Discussed role expectations",
    )
    assert ix["id"].startswith("ix-")
    assert ix["contact_id"] == "contact-1"
    assert ix["interaction_type"] == "email"
    assert ix["summary"] == "Discussed role expectations"


def test_interaction_unique_ids():
    ix1 = add_interaction(contact_id="c1", summary="A")
    ix2 = add_interaction(contact_id="c1", summary="B")
    assert ix1["id"] != ix2["id"]


def test_interaction_custom_occurred_at():
    ix = add_interaction(
        contact_id="c1",
        occurred_at="2026-04-01T10:00:00Z",
    )
    assert ix["occurred_at"] == "2026-04-01T10:00:00Z"


def test_interaction_defaults():
    ix = add_interaction(contact_id="c1")
    assert ix["interaction_type"] == "email"
    assert ix["summary"] == ""
    assert ix["occurred_at"]  # should be auto-set
