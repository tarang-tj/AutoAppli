"""Contacts CRM — track recruiters, hiring managers, and networking contacts."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone


def make_contact(
    *,
    job_id: str | None = None,
    name: str = "",
    role: str = "",
    company: str = "",
    email: str = "",
    phone: str = "",
    linkedin_url: str = "",
    relationship: str = "recruiter",
    notes: str = "",
    last_contacted_at: str | None = None,
    user_id: str | None = None,
) -> dict:
    """Create an in-memory contact dict."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": f"contact-{uuid.uuid4().hex[:12]}",
        "job_id": job_id,
        "name": name,
        "role": role,
        "company": company,
        "email": email,
        "phone": phone,
        "linkedin_url": linkedin_url,
        "relationship": relationship,
        "notes": notes,
        "last_contacted_at": last_contacted_at,
        "created_at": now,
        "updated_at": now,
    }


def add_interaction(
    *,
    contact_id: str,
    interaction_type: str = "email",
    summary: str = "",
    occurred_at: str | None = None,
) -> dict:
    """Create a contact interaction log entry."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": f"ix-{uuid.uuid4().hex[:12]}",
        "contact_id": contact_id,
        "interaction_type": interaction_type,
        "summary": summary,
        "occurred_at": occurred_at or now,
        "created_at": now,
    }
