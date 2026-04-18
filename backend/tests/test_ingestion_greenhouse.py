"""Unit tests for the Greenhouse ingestion source.

These don't hit the network — the HTTP call is monkeypatched with a fixture
payload so the test runs anywhere without flakiness.
"""
from __future__ import annotations

import json
from typing import Any

import pytest

from backend.app.services.ingestion import GreenhouseSource
from backend.app.services.ingestion.base import dedupe_jobs


FIXTURE_PAYLOAD: dict[str, Any] = {
    "jobs": [
        {
            "id": 12345,
            "title": "Senior Backend Engineer",
            "absolute_url": "https://boards.greenhouse.io/acme/jobs/12345",
            "location": {"name": "San Francisco, CA"},
            "content": "<p>We build scalable services in <strong>Python</strong>, <em>FastAPI</em>, and PostgreSQL. AWS experience required. Hybrid role.</p>",
            "updated_at": "2026-04-10T12:00:00Z",
            "first_published": "2026-04-01T12:00:00Z",
            "metadata": [
                {"name": "Team", "value": "Infra"},
            ],
            "company_name": "Acme Inc",
        },
        {
            "id": 67890,
            "title": "Staff ML Engineer",
            "absolute_url": "https://boards.greenhouse.io/acme/jobs/67890",
            "location": {"name": "Remote"},
            "content": "<p>Build with Python, PyTorch, and TensorFlow. Fully remote.</p>",
            "updated_at": "2026-04-12T12:00:00Z",
        },
    ]
}


def test_greenhouse_normalizes(monkeypatch):
    import backend.app.services.ingestion.greenhouse as gh
    monkeypatch.setattr(gh, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = GreenhouseSource()
    jobs = src.fetch(["acme"])
    assert len(jobs) == 2

    j1 = jobs[0]
    assert j1.source == "greenhouse"
    assert j1.external_id == "12345"
    assert j1.title == "Senior Backend Engineer"
    assert j1.company == "Acme Inc"
    assert j1.remote_type == "hybrid"
    assert "python" in j1.skills
    assert "fastapi" in j1.skills
    assert "postgresql" in j1.skills
    assert "aws" in j1.skills
    # HTML should be stripped
    assert "<p>" not in j1.description

    j2 = jobs[1]
    assert j2.remote_type == "remote"
    assert "pytorch" in j2.skills
    assert "tensorflow" in j2.skills


def test_dedupe_jobs(monkeypatch):
    import backend.app.services.ingestion.greenhouse as gh
    monkeypatch.setattr(gh, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = GreenhouseSource()
    jobs = src.fetch(["acme", "acme"])  # fetched twice
    assert len(jobs) == 4  # no dedupe yet
    deduped = dedupe_jobs(jobs)
    assert len(deduped) == 2


def test_to_row_shape(monkeypatch):
    import backend.app.services.ingestion.greenhouse as gh
    monkeypatch.setattr(gh, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = GreenhouseSource()
    jobs = src.fetch(["acme"])
    row = jobs[0].to_row()
    # Must have keys that match the Supabase jobs table
    expected = {"source", "external_id", "title", "company", "url", "description",
                "location", "remote_type", "salary_min", "salary_max", "skills",
                "tags", "posted_at"}
    assert expected.issubset(row.keys())
