"""Unit tests for the Ashby ingestion source.

These don't hit the network — the HTTP call is monkeypatched with a fixture
payload so the test runs anywhere without flakiness.
"""
from __future__ import annotations

from typing import Any

from backend.app.services.ingestion import AshbySource
from backend.app.services.ingestion.base import dedupe_jobs


FIXTURE_PAYLOAD: dict[str, Any] = {
    "apiVersion": "1",
    "jobs": [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "title": "Senior Infrastructure Engineer",
            "departmentName": "Engineering",
            "locationName": "San Francisco, CA",
            "secondaryLocations": [{"locationName": "New York, NY"}],
            "employmentType": "FullTime",
            "isRemote": False,
            "descriptionHtml": "<p>Build on <strong>Kubernetes</strong>, Terraform, and AWS.</p>",
            "descriptionPlain": "Build on Kubernetes, Terraform, and AWS. Hybrid role.",
            "jobUrl": "https://jobs.ashbyhq.com/acme/00000000-0000-0000-0000-000000000001",
            "publishedAt": "2026-04-10T12:00:00Z",
            "organizationName": "Acme Inc",
            "compensation": {
                "minValue": 180000,
                "maxValue": 240000,
                "currencyCode": "USD",
            },
        },
        {
            "id": "00000000-0000-0000-0000-000000000002",
            "title": "ML Research Engineer",
            "departmentName": "Research",
            "locationName": "Remote",
            "employmentType": "FullTime",
            "isRemote": True,
            "descriptionPlain": "Work with PyTorch and TensorFlow on large language models.",
            "jobUrl": "https://jobs.ashbyhq.com/acme/00000000-0000-0000-0000-000000000002",
            "publishedAt": "2026-04-12T12:00:00Z",
            "organizationName": "Acme Inc",
            "compensation": {
                "summaryComponents": [
                    {
                        "compensationTierSummary": {
                            "minValue": 200000,
                            "maxValue": 300000,
                            "currencyCode": "USD",
                        }
                    }
                ]
            },
        },
    ],
}


def test_ashby_normalizes(monkeypatch):
    import backend.app.services.ingestion.ashby as ab
    monkeypatch.setattr(ab, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = AshbySource()
    jobs = src.fetch(["acme"])
    assert len(jobs) == 2

    j1 = jobs[0]
    assert j1.source == "ashby"
    assert j1.external_id == "00000000-0000-0000-0000-000000000001"
    assert j1.title == "Senior Infrastructure Engineer"
    assert j1.company == "Acme Inc"
    # isRemote=False and description says "Hybrid" → hybrid
    assert j1.remote_type == "hybrid"
    assert "kubernetes" in j1.skills
    assert "terraform" in j1.skills
    assert "aws" in j1.skills
    # Secondary locations appended
    assert "San Francisco, CA" in (j1.location or "")
    assert "New York, NY" in (j1.location or "")
    # Flat compensation shape
    assert j1.salary_min == 180000
    assert j1.salary_max == 240000

    j2 = jobs[1]
    assert j2.remote_type == "remote"
    assert "pytorch" in j2.skills
    assert "tensorflow" in j2.skills
    # Summary-based compensation shape
    assert j2.salary_min == 200000
    assert j2.salary_max == 300000


def test_ashby_dedupe(monkeypatch):
    import backend.app.services.ingestion.ashby as ab
    monkeypatch.setattr(ab, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = AshbySource()
    jobs = src.fetch(["acme", "acme"])
    assert len(jobs) == 4
    deduped = dedupe_jobs(jobs)
    assert len(deduped) == 2


def test_ashby_to_row_shape(monkeypatch):
    import backend.app.services.ingestion.ashby as ab
    monkeypatch.setattr(ab, "_fetch_json", lambda url, timeout=20.0: FIXTURE_PAYLOAD)
    src = AshbySource()
    jobs = src.fetch(["acme"])
    row = jobs[0].to_row()
    expected = {
        "source", "external_id", "title", "company", "url", "description",
        "location", "remote_type", "salary_min", "salary_max", "skills",
        "tags", "posted_at",
    }
    assert expected.issubset(row.keys())


def test_ashby_falls_back_to_html(monkeypatch):
    """When descriptionPlain is missing we should still strip HTML."""
    import backend.app.services.ingestion.ashby as ab
    payload: dict[str, Any] = {
        "jobs": [
            {
                "id": "html-only",
                "title": "DevOps",
                "locationName": "NYC",
                "descriptionHtml": "<p>Docker and <strong>Kubernetes</strong>.</p>",
                "jobUrl": "https://jobs.ashbyhq.com/acme/html-only",
                "publishedAt": "2026-04-10T12:00:00Z",
            }
        ]
    }
    monkeypatch.setattr(ab, "_fetch_json", lambda url, timeout=20.0: payload)
    src = AshbySource()
    jobs = src.fetch(["acme"])
    assert len(jobs) == 1
    assert "<p>" not in jobs[0].description
    assert "docker" in jobs[0].skills
    assert "kubernetes" in jobs[0].skills
