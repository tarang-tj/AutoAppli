"""Router tests for app/routers/salary.py.

Compensation entries CRUD plus the /salary/compare aggregate. The router
tracks total_compensation as the sum of base + bonus + equity + signing +
benefits, recomputed on PATCH. Covered here:
- create / list / patch / delete happy paths
- list filter by job_id
- patch recomputes total_compensation
- compare returns ranked entries with best_total_id / best_base_id
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories.user_session_memory import compensations as mem_compensations
from app.routers import salary as salary_router


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(salary_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-salary-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()
    mem_compensations(fake_user).clear()


# ── POST /salary ─────────────────────────────────────────────────────────────


def test_create_compensation_happy_path(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/salary",
        json={
            "job_id": "job-1",
            "base_salary": 150000,
            "bonus": 20000,
            "equity_value": 50000,
            "signing_bonus": 10000,
            "benefits_value": 5000,
            "currency": "USD",
            "pay_period": "annual",
            "notes": "Series B startup",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["id"].startswith("comp-")
    assert body["job_id"] == "job-1"
    assert body["base_salary"] == 150000
    # 150k + 20k + 50k + 10k + 5k = 235k
    assert body["total_compensation"] == 235000
    assert body["currency"] == "USD"


def test_create_compensation_empty_body_uses_defaults(authed_client: TestClient):
    """All CompensationCreate fields default → empty {} produces a zero entry."""
    r = authed_client.post("/api/v1/salary", json={})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["base_salary"] == 0
    assert body["total_compensation"] == 0
    assert body["currency"] == "USD"  # schema default


# ── GET /salary ──────────────────────────────────────────────────────────────


def test_list_compensations_empty(authed_client: TestClient):
    r = authed_client.get("/api/v1/salary")
    assert r.status_code == 200
    assert r.json() == []


def test_list_compensations_filter_by_job_id(authed_client: TestClient):
    authed_client.post(
        "/api/v1/salary", json={"job_id": "job-A", "base_salary": 100000}
    )
    authed_client.post(
        "/api/v1/salary", json={"job_id": "job-B", "base_salary": 120000}
    )

    r = authed_client.get("/api/v1/salary", params={"job_id": "job-A"})
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["job_id"] == "job-A"


# ── PATCH /salary/{id} ───────────────────────────────────────────────────────


def test_patch_compensation_recomputes_total(authed_client: TestClient):
    """Updating any component recomputes total_compensation."""
    created = authed_client.post(
        "/api/v1/salary",
        json={"base_salary": 100000, "bonus": 10000},
    ).json()
    assert created["total_compensation"] == 110000

    r = authed_client.patch(
        f"/api/v1/salary/{created['id']}",
        json={"bonus": 50000},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["bonus"] == 50000
    # 100k + 50k = 150k
    assert body["total_compensation"] == 150000


def test_patch_compensation_unknown_id_404(authed_client: TestClient):
    r = authed_client.patch(
        "/api/v1/salary/comp-nope", json={"base_salary": 1}
    )
    assert r.status_code == 404


# ── DELETE /salary/{id} ──────────────────────────────────────────────────────


def test_delete_compensation_happy_then_404(authed_client: TestClient):
    created = authed_client.post(
        "/api/v1/salary", json={"base_salary": 100000}
    ).json()

    r = authed_client.delete(f"/api/v1/salary/{created['id']}")
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    r2 = authed_client.delete(f"/api/v1/salary/{created['id']}")
    assert r2.status_code == 404


def test_delete_compensation_unknown_id_404(authed_client: TestClient):
    r = authed_client.delete("/api/v1/salary/comp-nope")
    assert r.status_code == 404


# ── GET /salary/compare ──────────────────────────────────────────────────────


def test_compare_empty(authed_client: TestClient):
    """No entries → comparison shape with empty entries list."""
    r = authed_client.get("/api/v1/salary/compare")
    assert r.status_code == 200
    body = r.json()
    assert body["entries"] == []
    assert body["best_total"] is None
    assert body["best_base"] is None


def test_compare_ranks_by_total(authed_client: TestClient):
    """compare_offers ranks entries by total_compensation descending."""
    low = authed_client.post(
        "/api/v1/salary", json={"base_salary": 100000}
    ).json()
    high = authed_client.post(
        "/api/v1/salary", json={"base_salary": 200000}
    ).json()

    r = authed_client.get("/api/v1/salary/compare")
    assert r.status_code == 200
    body = r.json()
    assert body["best_total_id"] == high["id"]
    assert body["best_base_id"] == high["id"]
    assert body["count"] == 2
    assert body["average_total"] == 150000
    # entries are ranked highest first
    assert body["entries"][0]["id"] == high["id"]
    assert body["entries"][1]["id"] == low["id"]
