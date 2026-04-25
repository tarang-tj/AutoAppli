"""Router tests for app/routers/contacts.py.

Covers the HTTP boundary for the contacts CRM CRUD surface: list / create /
patch / delete plus the interactions sub-resource. Service-level behaviour
(make_contact / add_interaction shape) is covered by test_contacts_service.py;
this file exercises auth wiring, validation, and in-memory persistence.

Supabase is left unconfigured in CI; the router falls back to its in-memory
per-user store, which keeps tests hermetic.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import contacts as mem_contacts
from app.routers import contacts as contacts_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(contacts_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-contacts-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    mem_contacts(fake_user).clear()


def _create_contact(
    client: TestClient,
    *,
    name: str = "Dan Recruiter",
    role: str = "Recruiter",
    company: str = "Acme",
    relationship: str = "recruiter",
    email: str = "dan@example.com",
    job_id: str | None = None,
    notes: str = "",
) -> dict:
    payload = {
        "name": name,
        "role": role,
        "company": company,
        "relationship": relationship,
        "email": email,
        "notes": notes,
    }
    if job_id is not None:
        payload["job_id"] = job_id
    r = client.post("/api/v1/contacts", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


# ── POST /contacts ───────────────────────────────────────────────────────────


def test_create_contact_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/contacts",
        json={
            "name": "Dan Recruiter",
            "role": "Senior Recruiter",
            "company": "Acme",
            "relationship": "recruiter",
            "email": "dan@example.com",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["id"].startswith("contact-")
    assert body["name"] == "Dan Recruiter"
    assert body["role"] == "Senior Recruiter"
    assert body["company"] == "Acme"
    assert body["email"] == "dan@example.com"
    assert body["relationship"] == "recruiter"
    assert "created_at" in body
    assert "updated_at" in body


def test_create_contact_missing_name_returns_422(authed_client: TestClient):
    """`name` is the only required field on ContactCreate."""
    r = authed_client.post(
        "/api/v1/contacts",
        json={"role": "Recruiter", "company": "Acme"},
    )
    assert r.status_code == 422


def test_create_contact_accepts_minimal_body(authed_client: TestClient):
    """Only `name` is required; other fields default to empty strings."""
    r = authed_client.post("/api/v1/contacts", json={"name": "Solo Contact"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Solo Contact"
    assert body["role"] == ""
    assert body["company"] == ""
    assert body["relationship"] == "recruiter"  # schema default


def test_create_contact_string_email_passes_through(authed_client: TestClient):
    """`email` is a plain str (no EmailStr validation) — accepted as-is.

    Documents the *current* router behaviour: there is no email-format
    validation. If validation is added later, this test should be updated.
    """
    r = authed_client.post(
        "/api/v1/contacts",
        json={"name": "Loose Mail", "email": "not-an-email"},
    )
    assert r.status_code == 201
    assert r.json()["email"] == "not-an-email"


# ── GET /contacts ────────────────────────────────────────────────────────────


def test_list_contacts_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/contacts")
    assert r.status_code == 200
    assert r.json() == []


def test_list_contacts_after_create(authed_client: TestClient):
    _create_contact(authed_client, name="A")
    _create_contact(authed_client, name="B")
    r = authed_client.get("/api/v1/contacts")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 2
    # Router returns reversed order (newest first).
    assert rows[0]["name"] == "B"
    assert rows[1]["name"] == "A"


def test_list_contacts_filtered_by_job_id(authed_client: TestClient):
    _create_contact(authed_client, name="JobOne", job_id="job-1")
    _create_contact(authed_client, name="JobTwo", job_id="job-2")
    _create_contact(authed_client, name="NoJob")

    r = authed_client.get("/api/v1/contacts", params={"job_id": "job-1"})
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["name"] == "JobOne"


# ── PATCH /contacts/{id} ─────────────────────────────────────────────────────


def test_patch_partial_update_preserves_other_fields(authed_client: TestClient):
    contact = _create_contact(
        authed_client, name="Pat Smith", role="Recruiter", email="pat@example.com"
    )
    r = authed_client.patch(
        f"/api/v1/contacts/{contact['id']}",
        json={"notes": "Met at career fair"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["notes"] == "Met at career fair"
    # Untouched fields are preserved.
    assert body["name"] == "Pat Smith"
    assert body["role"] == "Recruiter"
    assert body["email"] == "pat@example.com"


def test_patch_unknown_id_returns_404(authed_client: TestClient):
    r = authed_client.patch(
        "/api/v1/contacts/contact-doesnotexist",
        json={"notes": "anything"},
    )
    assert r.status_code == 404


def test_patch_updates_updated_at(authed_client: TestClient):
    contact = _create_contact(authed_client, name="Time Test")
    original_updated = contact["updated_at"]
    r = authed_client.patch(
        f"/api/v1/contacts/{contact['id']}", json={"role": "New Role"}
    )
    assert r.status_code == 200
    # updated_at is bumped (string ISO timestamps lex-compare correctly).
    assert r.json()["updated_at"] >= original_updated


# ── DELETE /contacts/{id} ────────────────────────────────────────────────────


def test_delete_contact_happy_then_404(authed_client: TestClient):
    contact = _create_contact(authed_client, name="ToDelete")
    r = authed_client.delete(f"/api/v1/contacts/{contact['id']}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    # Re-deleting now 404s.
    r2 = authed_client.delete(f"/api/v1/contacts/{contact['id']}")
    assert r2.status_code == 404


def test_delete_unknown_id_returns_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/contacts/contact-nope")
    assert r.status_code == 404


# ── Interactions sub-resource (smoke) ────────────────────────────────────────


def test_list_interactions_for_unknown_contact_404(authed_client: TestClient):
    r = authed_client.get("/api/v1/contacts/contact-nope/interactions")
    assert r.status_code == 404


def test_create_and_list_interactions(authed_client: TestClient):
    contact = _create_contact(authed_client, name="With Interactions")
    cid = contact["id"]

    r_create = authed_client.post(
        f"/api/v1/contacts/{cid}/interactions",
        json={"interaction_type": "call", "summary": "First chat"},
    )
    assert r_create.status_code == 201, r_create.text
    ix = r_create.json()
    assert ix["id"].startswith("ix-")
    assert ix["interaction_type"] == "call"
    assert ix["summary"] == "First chat"

    r_list = authed_client.get(f"/api/v1/contacts/{cid}/interactions")
    assert r_list.status_code == 200
    rows = r_list.json()
    assert len(rows) == 1
    assert rows[0]["summary"] == "First chat"
