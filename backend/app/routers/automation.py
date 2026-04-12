"""Automation router — rules management, evaluation, and stale job detection."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id, jobs_use_supabase
from app.models.schemas import AutomationRuleCreate, AutomationRuleUpdate
from app.repositories import user_session_memory as mem
from app.repositories import jobs_supabase as jobs_sb
from app.repositories import jobs_memory
from app.services.automation_service import (
    DEFAULT_RULES,
    evaluate_rules,
    find_stale_jobs,
    make_rule,
)

router = APIRouter(tags=["automation"])


def _all_jobs(settings: Settings, user_id: str | None) -> list[dict]:
    """Retrieve all jobs for the user regardless of storage backend."""
    if jobs_use_supabase(settings) and user_id:
        return jobs_sb.list_jobs(settings, user_id, status=None)
    return jobs_memory.list_jobs(status=None)


def _init_default_rules(user_id: str | None):
    """Initialize default rules if not already present."""
    rules = mem.automation_rules(user_id)
    if not rules:
        for default in DEFAULT_RULES:
            rule = make_rule(
                user_id=user_id or "__demo__",
                rule_id=default["id"],
                name=default["name"],
                trigger=default["trigger"],
                action=default["action"],
                action_config=default["action_config"],
                is_active=True,
            )
            rules.append(rule)


@router.get("/automation/rules")
async def list_rules(user_id: str | None = Depends(get_jobs_user_id)):
    """List all automation rules for the user."""
    _init_default_rules(user_id)
    return mem.automation_rules(user_id)


@router.post("/automation/rules", status_code=201)
async def create_rule(
    body: AutomationRuleCreate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    """Create a new automation rule."""
    _init_default_rules(user_id)
    rule = make_rule(
        user_id=user_id or "__demo__",
        name=body.name,
        trigger=body.trigger,
        action=body.action,
        action_config=body.action_config,
        is_active=body.is_active,
    )
    mem.automation_rules(user_id).append(rule)
    return rule


@router.patch("/automation/rules/{rule_id}")
async def update_rule(
    rule_id: str,
    body: AutomationRuleUpdate,
    user_id: str | None = Depends(get_jobs_user_id),
):
    """Update an existing automation rule."""
    rules = mem.automation_rules(user_id)
    for rule in rules:
        if rule["id"] == rule_id:
            if body.name is not None:
                rule["name"] = body.name
            if body.trigger is not None:
                rule["trigger"] = body.trigger
            if body.action is not None:
                rule["action"] = body.action
            if body.action_config is not None:
                rule["action_config"] = body.action_config
            if body.is_active is not None:
                rule["is_active"] = body.is_active
            rule["updated_at"] = (
                __import__("datetime")
                .datetime.now(__import__("datetime").timezone.utc)
                .isoformat()
            )
            return rule
    raise HTTPException(status_code=404, detail="Rule not found")


@router.delete("/automation/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
):
    """Delete an automation rule."""
    rules = mem.automation_rules(user_id)
    for i, rule in enumerate(rules):
        if rule["id"] == rule_id:
            rules.pop(i)
            return {"id": rule_id, "deleted": True}
    raise HTTPException(status_code=404, detail="Rule not found")


@router.post("/automation/evaluate")
async def evaluate_rules_handler(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Evaluate all active rules against current jobs."""
    _init_default_rules(user_id)
    rules = mem.automation_rules(user_id)
    jobs = _all_jobs(settings, user_id)
    interviews = mem.interview_notes(user_id)
    suggestions = evaluate_rules(rules, jobs, interviews)
    return {"suggestions": suggestions}


@router.get("/automation/stale")
async def get_stale_jobs(
    days: int = 14,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Return jobs that haven't been updated in the specified days."""
    jobs = _all_jobs(settings, user_id)
    stale = find_stale_jobs(jobs, days)
    return {"stale_jobs": stale, "days": days}
