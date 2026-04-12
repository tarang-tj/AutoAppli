"""Tests for analytics_service.compute_analytics."""

import pytest
from datetime import datetime, timedelta, timezone

from app.services.analytics_service import compute_analytics


def _make_job(
    id: str,
    status: str = "bookmarked",
    source: str = "linkedin",
    company: str = "TestCo",
    days_ago_created: int = 10,
    days_ago_updated: int = 1,
    days_ago_applied: int | None = None,
) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "id": id,
        "status": status,
        "source": source,
        "company": company,
        "created_at": (now - timedelta(days=days_ago_created)).isoformat(),
        "updated_at": (now - timedelta(days=days_ago_updated)).isoformat(),
        "applied_at": (now - timedelta(days=days_ago_applied)).isoformat() if days_ago_applied is not None else None,
    }


SAMPLE_JOBS = [
    _make_job("j1", "bookmarked", "linkedin", "Spotify", 15, 15),
    _make_job("j2", "bookmarked", "indeed", "Stripe", 12, 12),
    _make_job("j3", "applied", "company-website", "Notion", 10, 8, 8),
    _make_job("j4", "applied", "linkedin", "Figma", 9, 6, 6),
    _make_job("j5", "applied", "linkedin", "Anthropic", 7, 4, 4),
    _make_job("j6", "interviewing", "company-website", "Databricks", 18, 2, 14),
    _make_job("j7", "interviewing", "linkedin", "HubSpot", 16, 1, 10),
    _make_job("j8", "offer", "linkedin", "Airbnb", 22, 1, 20),
    _make_job("j9", "rejected", "linkedin", "Meta", 28, 5, 25),
    _make_job("j10", "rejected", "indeed", "Twilio", 35, 3, 30),
]


class TestComputeAnalytics:
    def test_total_jobs(self):
        result = compute_analytics(SAMPLE_JOBS)
        assert result["total_jobs"] == 10

    def test_funnel_counts(self):
        result = compute_analytics(SAMPLE_JOBS)
        funnel = {s["stage"]: s["count"] for s in result["funnel"]}
        assert funnel["bookmarked"] == 2
        assert funnel["applied"] == 3
        assert funnel["interviewing"] == 2
        assert funnel["offer"] == 1
        assert funnel["rejected"] == 2
        assert funnel["ghosted"] == 0

    def test_conversions(self):
        result = compute_analytics(SAMPLE_JOBS)
        conv = result["conversions"]
        # 8 applied+ out of 10 total = 80%
        assert conv["bookmarked_to_applied"] == 80.0
        # 3 interviewing+ (2 interviewing + 1 offer) out of 8 applied+ = 37.5%
        assert conv["applied_to_interviewing"] == 37.5
        # 1 offer out of 3 interviewing+ = 33.3%
        assert conv["interviewing_to_offer"] == 33.3
        # 2 rejected out of 8 applied+ = 25%
        assert conv["rejection_rate"] == 25.0
        # 0 ghosted
        assert conv["ghost_rate"] == 0.0

    def test_durations_present(self):
        result = compute_analytics(SAMPLE_JOBS)
        dur = result["avg_durations_days"]
        # Should have values for all three duration types
        assert dur["bookmarked_to_applied"] is not None
        assert dur["applied_to_latest"] is not None
        assert dur["total_lifecycle"] is not None
        # Bookmarked to applied should be > 0
        assert dur["bookmarked_to_applied"] > 0

    def test_sources(self):
        result = compute_analytics(SAMPLE_JOBS)
        source_map = {s["source"]: s["count"] for s in result["sources"]}
        assert source_map["linkedin"] == 6
        assert source_map["indeed"] == 2
        assert source_map["company-website"] == 2

    def test_weekly_activity_length(self):
        result = compute_analytics(SAMPLE_JOBS)
        assert len(result["weekly_activity"]) == 8

    def test_top_companies(self):
        result = compute_analytics(SAMPLE_JOBS)
        companies = {c["company"]: c["count"] for c in result["top_companies"]}
        # Each company appears once in sample data
        assert all(v == 1 for v in companies.values())

    def test_response_rate(self):
        result = compute_analytics(SAMPLE_JOBS)
        # Responded = interviewing (2) + offer (1) + rejected (2) = 5
        # Applied total = 8
        # 5/8 = 62.5%
        assert result["response_rate"] == 62.5

    def test_summary(self):
        result = compute_analytics(SAMPLE_JOBS)
        s = result["summary"]
        # active = applied_total (8) - rejected (2) - ghosted (0) = 6
        assert s["active_applications"] == 6
        assert s["interviews_in_progress"] == 2
        assert s["offers"] == 1
        assert s["rejections"] == 2

    def test_empty_jobs(self):
        result = compute_analytics([])
        assert result["total_jobs"] == 0
        assert result["response_rate"] == 0.0
        assert result["summary"]["active_applications"] == 0
        assert len(result["funnel"]) == 6

    def test_single_bookmarked(self):
        jobs = [_make_job("only", "bookmarked")]
        result = compute_analytics(jobs)
        assert result["total_jobs"] == 1
        assert result["conversions"]["bookmarked_to_applied"] == 0.0
        assert result["summary"]["offers"] == 0
