"""Automation service — automation rules, evaluation, and stale job detection."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any


def make_rule(
    user_id: str,
    rule_id: str | None = None,
    name: str = "",
    trigger: str = "manual",
    action: str = "move_to_status",
    action_config: dict | None = None,
    is_active: bool = True,
    created_at: str | None = None,
    updated_at: str | None = None,
) -> dict[str, Any]:
    """Create an automation rule dict with all required fields."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": rule_id or f"rule-{uuid.uuid4()}",
        "user_id": user_id,
        "name": name,
        "trigger": trigger,
        "action": action,
        "action_config": action_config or {},
        "is_active": is_active,
        "created_at": created_at or now,
        "updated_at": updated_at or now,
    }


DEFAULT_RULES = [
    {
        "id": "rule-auto-apply",
        "name": "Auto-apply on submit",
        "trigger": "application_sent",
        "action": "move_to_status",
        "action_config": {"target_status": "applied"},
    },
    {
        "id": "rule-auto-interviewing",
        "name": "Move to interviewing",
        "trigger": "interview_scheduled",
        "action": "move_to_status",
        "action_config": {"target_status": "interviewing"},
    },
    {
        "id": "rule-ghost-14d",
        "name": "Ghost after 14 days",
        "trigger": "no_response_days",
        "action": "move_to_status",
        "action_config": {"days": 14, "target_status": "ghosted"},
    },
]


def _parse_dt(val: str | None) -> datetime | None:
    """Parse ISO timestamp to datetime."""
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def evaluate_rules(
    rules: list[dict[str, Any]],
    jobs: list[dict[str, Any]],
    interviews: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """
    Evaluate all active rules against current jobs.

    Returns list of suggested actions:
    [{rule_id, job_id, suggested_action, reason}]
    """
    if interviews is None:
        interviews = []

    suggestions: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)

    active_rules = [r for r in rules if r.get("is_active", True)]

    for rule in active_rules:
        rule_id = rule.get("id", "")
        trigger = rule.get("trigger", "manual")
        action = rule.get("action", "move_to_status")
        config = rule.get("action_config", {})

        # ── application_sent trigger ────────────────────────────────────
        if trigger == "application_sent":
            # Find jobs with applied_at but still in "bookmarked" status
            for job in jobs:
                if (
                    job.get("status") == "bookmarked"
                    and job.get("applied_at") is not None
                ):
                    target = config.get("target_status", "applied")
                    suggestions.append({
                        "rule_id": rule_id,
                        "job_id": job.get("id", ""),
                        "suggested_action": f"Move to {target}",
                        "reason": "Application has been sent",
                    })

        # ── interview_scheduled trigger ─────────────────────────────────
        elif trigger == "interview_scheduled":
            # Find jobs that have interviews but are still in "applied"
            interview_job_ids = {i.get("job_id") for i in interviews}
            for job in jobs:
                if (
                    job.get("status") == "applied"
                    and job.get("id") in interview_job_ids
                ):
                    target = config.get("target_status", "interviewing")
                    suggestions.append({
                        "rule_id": rule_id,
                        "job_id": job.get("id", ""),
                        "suggested_action": f"Move to {target}",
                        "reason": "Interview scheduled for this job",
                    })

        # ── no_response_days trigger ────────────────────────────────────
        elif trigger == "no_response_days":
            days_threshold = config.get("days", 14)
            target = config.get("target_status", "ghosted")

            for job in jobs:
                if job.get("status") == "applied":
                    applied_at_str = job.get("applied_at")
                    if applied_at_str:
                        applied_at = _parse_dt(applied_at_str)
                        if applied_at:
                            days_since = (now - applied_at).days
                            if days_since >= days_threshold:
                                suggestions.append({
                                    "rule_id": rule_id,
                                    "job_id": job.get("id", ""),
                                    "suggested_action": f"Move to {target}",
                                    "reason": f"No response for {days_since} days",
                                })

        # ── offer_received trigger ──────────────────────────────────────
        elif trigger == "offer_received":
            # Manual trigger — no auto-evaluation
            pass

        # ── manual trigger ──────────────────────────────────────────────
        elif trigger == "manual":
            # No auto-evaluation
            pass

    return suggestions


def find_stale_jobs(
    jobs: list[dict[str, Any]],
    days: int = 14,
) -> list[dict[str, Any]]:
    """Return jobs that haven't been updated in `days` days."""
    now = datetime.now(timezone.utc)
    stale = []

    for job in jobs:
        updated_at_str = job.get("updated_at")
        if updated_at_str:
            updated_at = _parse_dt(updated_at_str)
            if updated_at:
                days_since = (now - updated_at).days
                if days_since >= days:
                    stale.append(job)

    return stale
