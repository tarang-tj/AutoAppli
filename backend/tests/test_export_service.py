"""Tests for export_service — CSV, JSON, and report generation."""

import json
from datetime import datetime, timedelta, timezone

import pytest

from app.services.export_service import (
    export_jobs_csv,
    export_jobs_json,
    generate_summary_report,
)


@pytest.fixture
def mock_jobs():
    """Create mock job data for testing."""
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "job-1",
            "company": "Acme Corp",
            "title": "Data Engineer",
            "url": "https://example.com/job1",
            "status": "applied",
            "source": "linkedin",
            "applied_at": (now - timedelta(days=5)).isoformat(),
            "notes": "Good company",
            "created_at": (now - timedelta(days=10)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "job-2",
            "company": "Acme Corp",
            "title": "Analytics Manager",
            "url": "https://example.com/job2",
            "status": "interviewing",
            "source": "indeed",
            "applied_at": (now - timedelta(days=3)).isoformat(),
            "notes": "",
            "created_at": (now - timedelta(days=8)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "job-3",
            "company": "TechStart",
            "title": "Senior Engineer",
            "url": "https://example.com/job3",
            "status": "offer",
            "source": "linkedin",
            "applied_at": (now - timedelta(days=2)).isoformat(),
            "notes": "Strong offer",
            "created_at": (now - timedelta(days=6)).isoformat(),
            "updated_at": now.isoformat(),
        },
        {
            "id": "job-4",
            "company": "BigCorp",
            "title": "Product Manager",
            "url": "https://example.com/job4",
            "status": "rejected",
            "source": "company-website",
            "applied_at": (now - timedelta(days=15)).isoformat(),
            "notes": "Not a fit",
            "created_at": (now - timedelta(days=20)).isoformat(),
            "updated_at": now.isoformat(),
        },
    ]


def test_export_jobs_csv_basic(mock_jobs):
    """Test basic CSV export."""
    csv_output = export_jobs_csv(mock_jobs)
    lines = csv_output.strip().split("\n")

    # Should have header + 4 jobs
    assert len(lines) == 5
    # Header should contain expected columns
    assert "id" in lines[0]
    assert "company" in lines[0]
    assert "title" in lines[0]

    # First data row should contain job-1 data
    assert "job-1" in lines[1]
    assert "Acme Corp" in lines[1]


def test_export_jobs_csv_empty():
    """Test CSV export with empty jobs list."""
    csv_output = export_jobs_csv([])
    assert csv_output == ""


def test_export_jobs_json_basic(mock_jobs):
    """Test basic JSON export."""
    json_output = export_jobs_json(mock_jobs)
    data = json.loads(json_output)

    assert len(data) == 4
    assert data[0]["id"] == "job-1"
    assert data[0]["company"] == "Acme Corp"
    assert data[3]["status"] == "rejected"


def test_export_jobs_json_empty():
    """Test JSON export with empty jobs list."""
    json_output = export_jobs_json([])
    data = json.loads(json_output)
    assert data == []


def test_generate_summary_report_status_breakdown(mock_jobs):
    """Test that report correctly counts jobs by status."""
    report = generate_summary_report(mock_jobs)

    assert report["total_jobs"] == 4
    assert report["by_status"]["applied"] == 1
    assert report["by_status"]["interviewing"] == 1
    assert report["by_status"]["offer"] == 1
    assert report["by_status"]["rejected"] == 1


def test_generate_summary_report_source_breakdown(mock_jobs):
    """Test that report correctly counts jobs by source."""
    report = generate_summary_report(mock_jobs)

    assert report["by_source"]["linkedin"] == 2
    assert report["by_source"]["indeed"] == 1
    assert report["by_source"]["company-website"] == 1


def test_generate_summary_report_company_breakdown(mock_jobs):
    """Test that report correctly counts jobs by company."""
    report = generate_summary_report(mock_jobs)

    assert report["by_company"]["Acme Corp"] == 2
    assert report["by_company"]["TechStart"] == 1
    assert report["by_company"]["BigCorp"] == 1


def test_generate_summary_report_top_companies(mock_jobs):
    """Test that top companies are sorted correctly."""
    report = generate_summary_report(mock_jobs)

    assert len(report["top_companies"]) == 3
    # Acme Corp should be first (2 jobs)
    assert report["top_companies"][0]["company"] == "Acme Corp"
    assert report["top_companies"][0]["count"] == 2


def test_generate_summary_report_avg_days_in_pipeline(mock_jobs):
    """Test that average days in pipeline is calculated."""
    report = generate_summary_report(mock_jobs)

    # Should be a float or None
    assert report["avg_days_in_pipeline"] is not None
    assert isinstance(report["avg_days_in_pipeline"], (int, float))
    assert report["avg_days_in_pipeline"] > 0


def test_generate_summary_report_weekly_activity(mock_jobs):
    """Test that weekly activity report is generated."""
    report = generate_summary_report(mock_jobs)

    assert "weekly_application_rate" in report
    assert isinstance(report["weekly_application_rate"], dict)
    # Should have 8 weeks of data
    assert len(report["weekly_application_rate"]) == 8
