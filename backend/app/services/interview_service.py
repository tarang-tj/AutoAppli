"""Interview prep service — AI-generated talking points & CRUD for interview notes."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from app.services.claude_service import generate_text

# ── AI Prep ────────────────────────────────────────────────────────

INTERVIEW_PREP_SYSTEM = """\
You are a career coach specialising in interview preparation.
Given a job title, company name, and optionally a job description and resume,
generate structured interview preparation material.

Return valid JSON (no markdown fences) with exactly these keys:
{
  "company_overview": "2-3 sentence overview of the company, what they do, culture clues",
  "role_insights": "What this role likely involves day-to-day based on the title and description",
  "talking_points": ["point 1", "point 2", ... up to 5],
  "likely_questions": ["question 1", "question 2", ... up to 7],
  "questions_to_ask": ["question 1", "question 2", ... up to 5],
  "tips": ["tip 1", "tip 2", ... up to 3]
}
"""


async def generate_interview_prep(
    *,
    job_title: str,
    company: str,
    job_description: str = "",
    resume_text: str = "",
) -> dict:
    """Call Claude to produce structured interview prep material."""
    parts = [f"Job title: {job_title}", f"Company: {company}"]
    if job_description:
        parts.append(f"Job description:\n{job_description[:3000]}")
    if resume_text:
        parts.append(f"My resume summary:\n{resume_text[:2000]}")

    raw = await generate_text(
        system=INTERVIEW_PREP_SYSTEM,
        user_message="\n\n".join(parts),
        max_tokens=2048,
        temperature=0.6,
    )
    # Parse the JSON response (Claude sometimes wraps in backticks)
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return json.loads(text.strip())


# ── CRUD helpers (in-memory fallback) ──────────────────────────────

def make_interview_note(
    *,
    job_id: str,
    round_name: str = "",
    scheduled_at: str | None = None,
    interviewer_name: str = "",
    notes: str = "",
    prep_material: dict | None = None,
    user_id: str | None = None,
) -> dict:
    """Create a new interview note dict (for memory or Supabase insert)."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": f"int-{uuid.uuid4().hex[:12]}",
        "job_id": job_id,
        "round_name": round_name or "General",
        "scheduled_at": scheduled_at,
        "interviewer_name": interviewer_name,
        "notes": notes,
        "prep_material": prep_material,
        "status": "upcoming",
        "created_at": now,
        "updated_at": now,
    }
