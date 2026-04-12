from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.prompts.outreach_prompt import (
    OUTREACH_EMAIL_USER,
    OUTREACH_LINKEDIN_USER,
    OUTREACH_SYSTEM,
)
from app.services.claude_service import generate_text


def _parse_email_response(raw: str) -> tuple[str, str]:
    """Extract subject and body from Claude's email response."""
    subject = ""
    body = raw
    if "SUBJECT:" in raw:
        parts = raw.split("BODY:", 1)
        subject_part = parts[0].replace("SUBJECT:", "").strip()
        subject = subject_part
        if len(parts) > 1:
            body = parts[1].strip()
    return subject, body


async def generate_outreach(
    *,
    message_type: str,
    recipient_name: str,
    recipient_role: str,
    job_title: str,
    company: str,
    resume_summary: str = "",
    extra_context: str = "",
    applicant_name: str = "",
) -> dict:
    template = OUTREACH_EMAIL_USER if message_type == "email" else OUTREACH_LINKEDIN_USER

    applicant_context = ""
    if applicant_name.strip():
        applicant_context = (
            f"Candidate name (use naturally in greeting and sign-off): {applicant_name.strip()}"
        )

    user_prompt = template.format(
        recipient_name=recipient_name,
        recipient_role=recipient_role or "(not specified)",
        company=company or "(not specified)",
        job_title=job_title or "(not specified)",
        resume_summary=resume_summary or "(not provided)",
        extra_context=f"Additional context: {extra_context}" if extra_context else "",
        applicant_context=applicant_context,
    )

    raw = await generate_text(
        system=OUTREACH_SYSTEM,
        user_message=user_prompt,
        max_tokens=1024,
        temperature=0.7,
    )

    subject = None
    body = raw
    if message_type == "email":
        subject, body = _parse_email_response(raw)

    msg_id = f"msg-{uuid.uuid4().hex[:12]}"
    return {
        "id": msg_id,
        "message_type": message_type,
        "recipient_name": recipient_name,
        "recipient_role": recipient_role,
        "subject": subject,
        "body": body,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def generate_thank_you(
    job_info: dict,
    interviewer_name: str | None = None,
    interview_notes: str | None = None,
) -> dict:
    """Generate a thank-you note after an interview."""
    user_prompt = f"""Write a professional thank-you email after an interview.

Job: {job_info.get('title', 'N/A')} at {job_info.get('company', 'N/A')}
{"Interviewer: " + interviewer_name if interviewer_name else ""}
{"Key discussion points: " + interview_notes if interview_notes else ""}

The email should:
1. Express genuine gratitude
2. Reference specific topics discussed (if provided)
3. Reinforce enthusiasm for the role
4. Be concise (under 200 words)

Output plain email body text only (no Subject line in the body).
"""

    body = await generate_text(
        system="You are an expert at professional post-interview communications.",
        user_message=user_prompt,
        max_tokens=1024,
        temperature=0.5,
    )

    subject = f"Thank you — {job_info.get('title', '')} interview"

    return {"subject": subject, "body": body.strip()}
