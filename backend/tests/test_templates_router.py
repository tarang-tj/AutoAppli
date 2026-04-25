"""Router tests for app/routers/templates.py.

Document templates CRUD + a render endpoint that performs {{key}}
substitution. Service-layer behaviour (template ID format, render
mechanics) is partially covered by test_templates_service.py — this
file exercises wiring, validation, and the filtering semantics on the
list endpoint.
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import templates as mem_templates
from app.routers import templates as templates_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(templates_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-templates-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    mem_templates(fake_user).clear()


# ── POST /templates ──────────────────────────────────────────────────────────


def test_create_template_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/templates",
        json={
            "name": "Resume — Tech",
            "template_type": "resume",
            "content": "Hi {{recipient}}, I'm applying for {{role}}.",
            "category": "tech",
            "is_default": False,
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["id"].startswith("tpl-")
    assert body["name"] == "Resume — Tech"
    assert body["template_type"] == "resume"
    assert body["category"] == "tech"
    assert body["is_default"] is False


def test_create_template_missing_name_returns_422(authed_client: TestClient):
    """`name` is the only required field on TemplateCreate."""
    r = authed_client.post("/api/v1/templates", json={"template_type": "resume"})
    assert r.status_code == 422


def test_create_template_minimal_body(authed_client: TestClient):
    """Only name is required; other fields default."""
    r = authed_client.post("/api/v1/templates", json={"name": "Solo"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["template_type"] == "resume"  # schema default
    assert body["category"] == "general"


# ── GET /templates ───────────────────────────────────────────────────────────


def test_list_templates_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/templates")
    assert r.status_code == 200
    assert r.json() == []


def test_list_templates_filter_by_template_type(authed_client: TestClient):
    authed_client.post(
        "/api/v1/templates",
        json={"name": "R1", "template_type": "resume"},
    )
    authed_client.post(
        "/api/v1/templates",
        json={"name": "C1", "template_type": "cover_letter"},
    )

    r = authed_client.get(
        "/api/v1/templates", params={"template_type": "cover_letter"}
    )
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["name"] == "C1"


def test_list_templates_filter_by_category(authed_client: TestClient):
    authed_client.post(
        "/api/v1/templates", json={"name": "T", "category": "tech"}
    )
    authed_client.post(
        "/api/v1/templates", json={"name": "F", "category": "finance"}
    )

    r = authed_client.get("/api/v1/templates", params={"category": "tech"})
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["name"] == "T"


# ── PATCH /templates/{id} ────────────────────────────────────────────────────


def test_patch_template_partial_update(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/templates", json={"name": "Original", "category": "tech"}
    ).json()

    r = authed_client.patch(
        f"/api/v1/templates/{created['id']}", json={"name": "Updated"}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["name"] == "Updated"
    # Category preserved.
    assert body["category"] == "tech"


def test_patch_template_unknown_id_404(authed_client: TestClient):
    r = authed_client.patch(
        "/api/v1/templates/tpl-nope", json={"name": "x"}
    )
    assert r.status_code == 404


# ── DELETE /templates/{id} ───────────────────────────────────────────────────


def test_delete_template_happy_then_404(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/templates", json={"name": "ToDelete"}
    ).json()
    r = authed_client.delete(f"/api/v1/templates/{created['id']}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    r2 = authed_client.delete(f"/api/v1/templates/{created['id']}")
    assert r2.status_code == 404


def test_delete_template_unknown_id_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/templates/tpl-nope")
    assert r.status_code == 404


# ── POST /templates/{id}/render ──────────────────────────────────────────────


def test_render_template_substitutes_placeholders(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/templates",
        json={
            "name": "Greeting",
            "content": "Hello {{name}}, applying to {{role}}.",
        },
    ).json()

    r = authed_client.post(
        f"/api/v1/templates/{created['id']}/render",
        json={"variables": {"name": "Pat", "role": "Backend"}},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["template_id"] == created["id"]
    assert body["rendered_content"] == "Hello Pat, applying to Backend."


def test_render_template_missing_variable_left_as_placeholder(
    authed_client: TestClient,
):
    """Per render_template: missing variables are left as `{{key}}`."""
    created = authed_client.post(
        "/api/v1/templates",
        json={"name": "Partial", "content": "Hi {{name}}, {{missing}}."},
    ).json()

    r = authed_client.post(
        f"/api/v1/templates/{created['id']}/render",
        json={"variables": {"name": "Sam"}},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["rendered_content"] == "Hi Sam, {{missing}}."


def test_render_template_unknown_id_404(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/templates/tpl-nope/render", json={"variables": {}}
    )
    assert r.status_code == 404
