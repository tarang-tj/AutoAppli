"""Tests for automation_service."""

import pytest
from datetime import datetime, timedelta, timezone

from app.services.automation_service import (
    DEFAULT_RULES,
    evaluate_rules,
    find_stale_jobs,
    make_rule,
)


def _make_job(
    id: str,
    status: str = "bookmarked",
    company: str = "TestCo",
    days_ago_created: int = 10,
    days_ago_updated: int = 1,
    days_ago_applied: int | None = None,
) -> dict:
    """Helper to create a test job."""
    now = datetime.now(timezone.utc)
    return {
        "id": id,
        "status": status,
        "company": company,
        "created_at": (now - timedelta(days=days_ago_created)).isoformat(),
        "updated_at": (now - timedelta(days=days_ago_updated)).isoformat(),
        "applied_at": (
            (now - timedelta(days=days_ago_applied)).isoformat()
            if days_ago_applied is not None
            else None
        ),
    }


def _make_interview(job_id: str) -> dict:
    """Helper to create a test interview."""
    now = datetime.now(timezone.utc)
    return {
        "id": f"int-{job_id}",
        "job_id": job_id,
        "title": "Technical Round",
        "scheduled_at": (now + timedelta(days=3)).isoformat(),
    }


class TestMakeRule:
    def test_rule_has_required_fields(self):
        rule = make_rule("user-123", name="Test Rule", trigger="manual")
        assert "id" in rule
        assert rule["id"].startswith("rule-")
        assert rule["user_id"] == "user-123"
        assert rule["name"] == "Test Rule"
        assert rule["trigger"] == "manual"
        assert rule["action"] == "move_to_status"
        assert rule["action_config"] == {}
        assert rule["is_active"] is True
        assert "created_at" in rule
        assert "updated_at" in rule

    def test_rule_custom_fields(self):
        config = {"days": 7, "target_status": "ghosted"}
        rule = make_rule(
            "user-123",
            name="Custom Rule",
            trigger="no_response_days",
            action="move_to_status",
            action_config=config,
            is_active=False,
        )
        assert rule["name"] == "Custom Rule"
        assert rule["trigger"] == "no_response_days"
        assert rule["action_config"] == config
        assert rule["is_active"] is False

    def test_rule_unique_ids(self):
        rule1 = make_rule("user-123")
        rule2 = make_rule("user-123")
        assert rule1["id"] != rule2["id"]


class TestDefaultRules:
    def test_default_rules_count(self):
        assert len(DEFAULT_RULES) == 3

    def test_default_rules_triggers(self):
        triggers = [r["trigger"] for r in DEFAULT_RULES]
        assert "application_sent" in triggers
        assert "interview_scheduled" in triggers
        assert "no_response_days" in triggers


class TestEvaluateRules:
    def test_evaluate_no_response(self):
        """Test no_response_days trigger — job applied >14 days ago, still 'applied'."""
        job = _make_job("j1", status="applied", days_ago_applied=15)
        rule = make_rule(
            "user-123",
            rule_id="rule-test",
            trigger="no_response_days",
            action="move_to_status",
            action_config={"days": 14, "target_status": "ghosted"},
        )
        suggestions = evaluate_rules([rule], [job])

        assert len(suggestions) == 1
        assert suggestions[0]["rule_id"] == "rule-test"
        assert suggestions[0]["job_id"] == "j1"
        assert "ghosted" in suggestions[0]["suggested_action"].lower()

    def test_evaluate_bookmarked_with_applied_at(self):
        """Test application_sent trigger."""
        job = _make_job("j1", status="bookmarked", days_ago_applied=5)
        rule = make_rule(
            "user-123",
            rule_id="rule-test",
            trigger="application_sent",
            action="move_to_status",
            action_config={"target_status": "applied"},
        )
        suggestions = evaluate_rules([rule], [job])

        assert len(suggestions) == 1
        assert suggestions[0]["job_id"] == "j1"
        assert "applied" in suggestions[0]["suggested_action"].lower()

    def test_evaluate_applied_with_interview(self):
        """Test interview_scheduled trigger."""
        job = _make_job("j1", status="applied")
        interview = _make_interview("j1")
        rule = make_rule(
            "user-123",
            rule_id="rule-test",
            trigger="interview_scheduled",
            action="move_to_status",
            action_config={"target_status": "interviewing"},
        )
        suggestions = evaluate_rules([rule], [job], [interview])

        assert len(suggestions) == 1
        assert suggestions[0]["job_id"] == "j1"
        assert "interviewing" in suggestions[0]["suggested_action"].lower()

    def test_evaluate_no_matches(self):
        """Test evaluation with no matching conditions."""
        job = _make_job("j1", status="interviewing")
        rule = make_rule(
            "user-123",
            rule_id="rule-test",
            trigger="application_sent",
            action="move_to_status",
            action_config={"target_status": "applied"},
        )
        suggestions = evaluate_rules([rule], [job])

        assert len(suggestions) == 0

    def test_evaluate_inactive_rule(self):
        """Test that inactive rules are not evaluated."""
        job = _make_job("j1", status="bookmarked", days_ago_applied=15)
        rule = make_rule(
            "user-123",
            rule_id="rule-test",
            trigger="no_response_days",
            action="move_to_status",
            action_config={"days": 14, "target_status": "ghosted"},
            is_active=False,
        )
        suggestions = evaluate_rules([rule], [job])

        assert len(suggestions) == 0


class TestFindStaleJobs:
    def test_find_stale_jobs(self):
        """Test finding jobs not updated in 14 days."""
        jobs = [
            _make_job("j1", days_ago_updated=20),
            _make_job("j2", days_ago_updated=10),
            _make_job("j3", days_ago_updated=14),
        ]
        stale = find_stale_jobs(jobs, days=14)

        # j1 (20 days) and j3 (14 days, >= threshold)
        assert len(stale) == 2
        assert any(j["id"] == "j1" for j in stale)
        assert any(j["id"] == "j3" for j in stale)

    def test_find_stale_jobs_custom_days(self):
        """Test with custom day threshold."""
        jobs = [
            _make_job("j1", days_ago_updated=30),
            _make_job("j2", days_ago_updated=10),
            _make_job("j3", days_ago_updated=5),
        ]
        stale = find_stale_jobs(jobs, days=7)

        # j1 (30 days) and j2 (10 days)
        assert len(stale) == 2
        assert any(j["id"] == "j1" for j in stale)
        assert any(j["id"] == "j2" for j in stale)
