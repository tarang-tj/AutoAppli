"""Notification & reminder generation — AI-powered follow-up nudges and interview reminders."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone


# ── Reminder types ────────────────────────────────────────────────

REMINDER_TYPES = {
    "interview_upcoming": "Upcoming Interview Reminder",
    "follow_up_application": "Application Follow-Up",
    "follow_up_interview": "Post-Interview Follow-Up",
    "offer_deadline": "Offer Deadline Reminder",
    "custom": "Custom Reminder",
}


def make_reminder(
    *,
    job_id: str | None = None,
    reminder_type: str = "custom",
    title: str = "",
    message: str = "",
    due_at: str | None = None,
    user_id: str | None = None,
) -> dict:
    """Create an in-memory reminder dict."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": f"rem-{uuid.uuid4().hex[:12]}",
        "job_id": job_id,
        "reminder_type": reminder_type,
        "title": title or REMINDER_TYPES.get(reminder_type, "Reminder"),
        "message": message,
        "due_at": due_at,
        "is_read": False,
        "is_dismissed": False,
        "created_at": now,
        "updated_at": now,
    }


def generate_auto_reminders(jobs: list[dict], interviews: list[dict]) -> list[dict]:
    """Scan jobs + interviews and generate smart reminders.

    Rules:
    - Interview in next 48h → upcoming interview reminder
    - Applied > 7 days ago with no status change → follow-up nudge
    - Offer status with notes containing "deadline" → offer deadline reminder
    - Interview completed > 2 days ago → post-interview follow-up
    """
    now = datetime.now(timezone.utc)
    reminders: list[dict] = []

    # Interview reminders — upcoming in next 48h
    for iv in interviews:
        if iv.get("status") != "upcoming":
            continue
        sched = iv.get("scheduled_at")
        if not sched:
            continue
        try:
            dt = datetime.fromisoformat(sched.replace("Z", "+00:00"))
            if hasattr(dt, "tzinfo") and dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        hours_until = (dt - now).total_seconds() / 3600
        if 0 < hours_until <= 48:
            job_id = iv.get("job_id", "")
            round_name = iv.get("round_name", "Interview")
            interviewer = iv.get("interviewer_name", "")
            msg = f"Your {round_name} is coming up"
            if interviewer:
                msg += f" with {interviewer}"
            msg += f" in {int(hours_until)} hours. Review your prep material!"
            reminders.append(make_reminder(
                job_id=job_id,
                reminder_type="interview_upcoming",
                title=f"{round_name} — coming up soon",
                message=msg,
                due_at=sched,
            ))

    # Application follow-up — applied > 7 days ago, still in "applied" status
    for job in jobs:
        if job.get("status") != "applied":
            continue
        applied_at = job.get("applied_at") or job.get("updated_at")
        if not applied_at:
            continue
        try:
            dt = datetime.fromisoformat(applied_at.replace("Z", "+00:00"))
            if hasattr(dt, "tzinfo") and dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        days_since = (now - dt).total_seconds() / 86400
        if days_since >= 7:
            company = job.get("company", "the company")
            title = job.get("title", "the role")
            reminders.append(make_reminder(
                job_id=job.get("id"),
                reminder_type="follow_up_application",
                title=f"Follow up with {company}",
                message=f"It's been {int(days_since)} days since you applied for {title} at {company}. Consider sending a polite follow-up email.",
                due_at=now.isoformat(),
            ))

    # Offer deadline
    for job in jobs:
        if job.get("status") != "offer":
            continue
        notes = (job.get("notes") or "").lower()
        if "deadline" in notes or "decision" in notes or "expire" in notes:
            company = job.get("company", "the company")
            title_str = job.get("title", "the role")
            reminders.append(make_reminder(
                job_id=job.get("id"),
                reminder_type="offer_deadline",
                title=f"Offer deadline — {company}",
                message=f"You have a pending offer for {title_str} at {company}. Don't forget to respond before the deadline!",
                due_at=now.isoformat(),
            ))

    # Post-interview follow-up — completed interviews > 2 days ago
    for iv in interviews:
        if iv.get("status") != "completed":
            continue
        updated = iv.get("updated_at") or iv.get("created_at")
        if not updated:
            continue
        try:
            dt = datetime.fromisoformat(updated.replace("Z", "+00:00"))
            if hasattr(dt, "tzinfo") and dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        days_since = (now - dt).total_seconds() / 86400
        if days_since >= 2:
            job_id = iv.get("job_id", "")
            round_name = iv.get("round_name", "interview")
            reminders.append(make_reminder(
                job_id=job_id,
                reminder_type="follow_up_interview",
                title=f"Follow up after {round_name}",
                message=f"It's been {int(days_since)} days since your {round_name}. Consider sending a thank-you note if you haven't already.",
                due_at=now.isoformat(),
            ))

    return reminders
