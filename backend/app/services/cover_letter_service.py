from __future__ import annotations

import uuid
from datetime import datetime, timezone

from app.config import get_settings
from app.services.claude_service import generate_text

TONE_OPTIONS = ["professional", "enthusiastic", "conversational", "formal"]


async def generate_cover_letter(
    *,
    job_title: str = "",
    company: str = "",
    job_description: str = "",
    resume_text: str = "",
    tone: str = "professional",
    instructions: str = "",
) -> dict:
    """Generate a cover letter using Claude API or return a template-based placeholder.

    Returns a dict with id, content, tone, and created_at.
    If ANTHROPIC_API_KEY is not set, returns a template-based placeholder.
    """
    settings = get_settings()

    # Check if we have API key
    has_api_key = bool(settings.ANTHROPIC_API_KEY)

    if has_api_key:
        content = await _generate_with_claude(
            job_title=job_title,
            company=company,
            job_description=job_description,
            resume_text=resume_text,
            tone=tone,
            instructions=instructions,
        )
    else:
        # Template-based placeholder
        content = _generate_template(
            job_title=job_title,
            company=company,
            tone=tone,
        )

    cl_id = f"cl-{uuid.uuid4().hex[:12]}"
    return {
        "id": cl_id,
        "content": content,
        "tone": tone,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def _generate_with_claude(
    *,
    job_title: str,
    company: str,
    job_description: str,
    resume_text: str,
    tone: str,
    instructions: str,
) -> str:
    """Generate cover letter using Claude API."""
    system_prompt = """You are an expert cover letter writer. Generate personalized, compelling cover letters that highlight relevant skills and experience.

Write in a clear, professional manner unless otherwise specified by the tone parameter. The cover letter should be 3-4 paragraphs, approximately 250-350 words.

Keep the tone consistent throughout:
- professional: formal, business-like language
- enthusiastic: energetic, passionate about the opportunity
- conversational: friendly, personable tone
- formal: very formal, traditional business letter style"""

    tone_instruction = f"\nTone: {tone}"

    user_message = f"""Generate a cover letter with these details:

Job Title: {job_title or "(not specified)"}
Company: {company or "(not specified)"}

Job Description:
{job_description or "(not provided)"}

Resume/Background:
{resume_text or "(not provided)"}

{f"Special Instructions: {instructions}" if instructions else ""}

{tone_instruction}

Write only the cover letter content. Do not include 'Dear Hiring Manager' greeting or signature block - just the main body paragraphs."""

    content = await generate_text(
        system=system_prompt,
        user_message=user_message,
        max_tokens=1024,
        temperature=0.7,
    )

    return content


def _generate_template(
    *,
    job_title: str = "",
    company: str = "",
    tone: str = "professional",
) -> str:
    """Generate a template-based placeholder cover letter."""
    company_name = company or "the company"
    role_name = job_title or "this role"

    tone_phrases = {
        "professional": {
            "opening": "I am writing to express my strong interest in the",
            "body": "My background and experience make me well-suited for this position.",
            "enthusiasm": "I am confident in my ability to contribute",
        },
        "enthusiastic": {
            "opening": "I am excited to apply for the",
            "body": "I am truly passionate about this opportunity and confident in my ability to excel.",
            "enthusiasm": "I am eager to bring my skills and energy",
        },
        "conversational": {
            "opening": "I'd love to tell you about my interest in the",
            "body": "I think we'd be a great fit together.",
            "enthusiasm": "I'm genuinely interested in joining your team",
        },
        "formal": {
            "opening": "I hereby submit my application for the",
            "body": "I possess the qualifications and expertise required for this position.",
            "enthusiasm": "I would welcome the opportunity to contribute",
        },
    }

    phrases = tone_phrases.get(tone, tone_phrases["professional"])

    template = f"""{phrases['opening']} {role_name} at {company_name}.

{phrases['body']} With my background in relevant areas and proven track record of success, I believe I can make meaningful contributions to your team. I am committed to delivering high-quality work and collaborating effectively with colleagues.

{phrases['enthusiasm']} to {company_name}. I would appreciate the opportunity to discuss how my skills align with your team's needs. Thank you for considering my application.

I look forward to hearing from you.

Best regards"""

    return template
