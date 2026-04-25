"""Router tests for app/routers/export.py.

Three endpoints, all GET, no AI:
- GET /export/csv     → text/csv attachment built from the user's jobs
- GET /export/json    → application/json attachment
- GET /export/report  → JSON summary report dict

Service-layer behaviour (CSV column order, summary computation) is
covered by test_export_service.py — this file checks Content-Type,
Content-Disposition, and the empty-board case.
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories import jobs_memory
from app.routers import export as export_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(export_router.router, prefix="/api/v1")
    return a


@pytest.fixture(autouse=True)
def _reset_jobs_memory():
    jobs_memory._jobs.clear()
    yield
    jobs_memory._jobs.clear()


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-export-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()


def _seed_job(**overrides) -> dict:
    defaults = dict(
        company="Acme",
        title="Backend Engineer",
        url="https://acme.example/jobs/abc",
        description="Build APIs.",
        source="manual",
    )
    defaults.update(overrides)
    return jobs_memory.create_job(
        defaults["company"],
        defaults["title"],
        defaults["url"],
        defaults["description"],
        defaults["source"],
    )


# ── GET /export/csv ──────────────────────────────────────────────────────────


def test_export_csv_empty(authed_client: TestClient):
    """Empty board returns 200 with an empty body (still text/csv)."""
    r = authed_client.get("/api/v1/export/csv")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers.get("content-disposition", "")
    assert r.content == b""


def test_export_csv_includes_header_and_rows(authed_client: TestClient):
    """A populated board yields a CSV with header + one row per job."""
    _seed_job(company="Acme", url="https://x.example/1")
    _seed_job(company="Initech", url="https://x.example/2")

    r = authed_client.get("/api/v1/export/csv")
    assert r.status_code == 200
    text = r.text
    # Header line first (from export_jobs_csv fieldnames).
    first_line = text.splitlines()[0]
    assert "company" in first_line
    assert "title" in first_line
    # Both companies show up somewhere in the body.
    assert "Acme" in text
    assert "Initech" in text


# ── GET /export/json ─────────────────────────────────────────────────────────


def test_export_json_empty_board(authed_client: TestClient):
    """No jobs → "[]" JSON body, application/json."""
    r = authed_client.get("/api/v1/export/json")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/json")
    assert "attachment" in r.headers.get("content-disposition", "")
    # The body is a JSON array.
    parsed = json.loads(r.content)
    assert parsed == []


def test_export_json_returns_jobs_array(authed_client: TestClient):
    """The JSON body parses to a list of job dicts."""
    _seed_job(company="Acme", url="https://x.example/1")
    r = authed_client.get("/api/v1/export/json")
    assert r.status_code == 200
    rows = json.loads(r.content)
    assert isinstance(rows, list)
    assert len(rows) == 1
    assert rows[0]["company"] == "Acme"


# ── GET /export/report ───────────────────────────────────────────────────────


def test_export_report_empty(authed_client: TestClient):
    """Empty board → summary with total_jobs=0 and empty buckets."""
    r = authed_client.get("/api/v1/export/report")
    assert r.status_code == 200
    body = r.json()
    assert body["total_jobs"] == 0
    assert body["by_status"] == {}
    assert body["top_companies"] == []
    assert body["avg_days_in_pipeline"] is None


def test_export_report_populated(authed_client: TestClient):
    """Report counts jobs by status and company."""
    _seed_job(company="Acme", url="https://x.example/1")
    _seed_job(company="Acme", url="https://x.example/2")
    _seed_job(company="Initech", url="https://x.example/3")

    r = authed_client.get("/api/v1/export/report")
    assert r.status_code == 200
    body = r.json()
    assert body["total_jobs"] == 3
    # All three new jobs default to bookmarked.
    assert body["by_status"].get("bookmarked") == 3
    # Acme has 2; should be ranked first in top_companies.
    assert body["top_companies"][0]["company"] == "Acme"
    assert body["top_companies"][0]["count"] == 2
