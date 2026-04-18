"""Unit tests for the Lever ingestion source.

These don't hit the network — the HTTP call is monkeypatched with a fixture
payload so the test runs anywhere without flakiness.
"""
from __future__ import annotations

from typing import Any

from backend.app.services.ingestion import LeverSource
from backend.app.services.ingestion.base import dedupe_jobs


# createdAt values are ms timestamps. 1704067200000 == 2024-01-01T00:00:00Z.
FIXTURE_PAYLOAD: list[dict[str, Any]] = [
    {
        "id": "abc-123",
        "text": "Senior Backend Engineer",
        "hostedUrl": "https://jobs.lever.co/acme/abc-123",
        "applyUrl": "https://jobs.lever.co/acme/abc-123/apply",
        "description": "<p>We build scalable services in <strong>Python</strong> and <em>FastAPI</em>.</p>",
        "descriptionPlain": "We build scalable services in Python and FastAPI.",
        "lists": [
            {
                "text": "Requirements",
                "content": "<ul><li>PostgreSQL experience</li><li>AWS familiarity</li></ul>",
                "contentPlain": "PostgreSQL experience. AWS familiarity.",
            }
        ],
        "additional": "Nice to have: Kubernetes.",
        "additionalPlain": "Nice to have: Kubernetes.",
        "categories": {
            "team": "Platform",
            "department": "Engineering",
            "commitment": "Full-time",
            "location": "San Francisco",
            "allLocations": ["San Francisco", "Remote - US"],
        },
        "workplaceType": "hybrid",
        "createdAt": 1704067200000,
    },
    {
        "id": "xyz-789",
        "text": "Staff ML Engineer",
        "hostedUrl": "https://jobs.lever.co/acme/xyz-789",
        "descriptionPlain": "Build with Python, PyTorch, and TensorFlow. Fully remote role.",
        "categories": {
            "team": "Research",
            "department": "ML",
            "commitment": "Full-time",
            "location": "Remote",
        },
        # No workplaceType — should fall back to keyword sniff → "remote".
        "createdAt": 1706745600000,
    },
]


def test_lever_normalizes(monkeypatch):
    import backend.app.services.ingestion.lever as lv
    monkeypatch.setattr(lv, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = LeverSource()
    jobs = src.fetch(["acme"])
    assert len(jobs) == 2

    j1 = jobs[0]
    assert j1.source == "lever"
    assert j1.external_id == "abc-123"
    assert j1.title == "Senior Backend Engineer"
    assert j1.url == "https://jobs.lever.co/acme/abc-123"
    assert j1.remote_type == "hybrid"
    assert "python" in j1.skills
    assert "fastapi" in j1.skills
    # Skills should pull from lists + additional too
    assert "postgresql" in j1.skills
    assert "aws" in j1.skills
    assert "kubernetes" in j1.skills
    # Posted_at should be an ISO-8601 string, not the raw ms number
    assert j1.posted_at is not None and "T" in j1.posted_at
    assert j1.posted_at.startswith("2024-")

    j2 = jobs[1]
    assert j2.remote_type == "remote"
    assert "pytorch" in j2.skills
    assert "tensorflow" in j2.skills


def test_lever_dedupe(monkeypatch):
    import backend.app.services.ingestion.lever as lv
    monkeypatch.setattr(lv, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = LeverSource()
    jobs = src.fetch(["acme", "acme"])  # fetched twice
    assert len(jobs) == 4
    deduped = dedupe_jobs(jobs)
    assert len(deduped) == 2


def test_lever_to_row_shape(monkeypatch):
    import backend.app.services.ingestion.lever as lv
    monkeypatch.setattr(lv, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = LeverSource()
    jobs = src.fetch(["acme"])
    row = jobs[0].to_row()
    expected = {
        "source", "external_id", "title", "company", "url", "description",
        "location", "remote_type", "salary_min", "salary_max", "skills",
        "tags", "posted_at",
    }
    assert expected.issubset(row.keys())


def test_lever_handles_postings_wrapper(monkeypatch):
    """Some Lever responses wrap the list in {"postings": [...]}."""
    import backend.app.services.ingestion.lever as lv
    wrapped = {"postings": FIXTURE_PAYLOAD}
    monkeypatch.setattr(lv, "_fetch_json", lambda url, timeout=20.0: wrapped)
    src = LeverSource()
    jobs = src.fetch(["acme"])
    assert len(jobs) == 2
