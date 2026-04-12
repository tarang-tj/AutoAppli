def build_outreach_prompt(
    job_info: dict,
    contact_info: dict | None,
    resume_text: str | None,
    outreach_type: str,
    tone: str = "professional",
    additional_context: str | None = None,
) -> str:
    """
    Build a prompt for Claude to generate an outreach message
    (email, LinkedIn message, or cover letter).
    """
    job_section = f"""JOB DETAILS:
- Title: {job_info.get('title', 'N/A')}
- Company: {job_info.get('company', 'N/A')}
- Location: {job_info.get('location', 'N/A')}
- Description: {job_info.get('description', 'N/A')[:1500] if job_info.get('description') else 'N/A'}
"""

    contact_section = ""
    if contact_info:
        contact_section = f"""
RECIPIENT:
- Name: {contact_info.get('name', 'Hiring Manager')}
- Role: {contact_info.get('role', 'N/A')}
- Company: {contact_info.get('company', job_info.get('company', 'N/A'))}
"""

    resume_section = ""
    if resume_text:
        # Truncate to keep prompt reasonable
        truncated = resume_text[:2000]
        resume_section = f"""
MY BACKGROUND (from resume):
---
{truncated}
---
"""

    extra_section = ""
    if additional_context:
        extra_section = f"""
ADDITIONAL CONTEXT:
{additional_context}
"""

    type_instructions = _get_type_instructions(outreach_type)

    return f"""Generate a {outreach_type} message for a job opportunity.

{job_section}
{contact_section}
{resume_section}
{extra_section}

TONE: {tone}

{type_instructions}

IMPORTANT:
- Be authentic and specific. Reference details from the job description.
- If resume information is provided, highlight relevant experience.
- Do NOT be generic. Make it clear this message is written for THIS specific role.
- Keep it concise and respectful of the reader's time.
"""


def _get_type_instructions(outreach_type: str) -> str:
    """Return format-specific instructions based on message type."""

    if outreach_type == "email":
        return """FORMAT: Email
- Start with "Subject: <subject line>"
- Then a blank line, then the email body.
- Include a greeting, 2-3 concise paragraphs, and a professional sign-off.
- Total length: 150-250 words for the body.
- The subject line should be specific and compelling (not generic like "Job Inquiry").
"""

    if outreach_type == "linkedin":
        return """FORMAT: LinkedIn Message
- Do NOT include a subject line.
- Keep it under 300 characters for a connection request, or under 150 words for an InMail.
- Be personable and conversational while remaining professional.
- Reference something specific about the person or company if possible.
- End with a clear but soft call to action.
"""

    if outreach_type == "cover_letter":
        return """FORMAT: Cover Letter
- Start with "Subject: Cover Letter - <Job Title> at <Company>"
- Write a formal but engaging cover letter (3-4 paragraphs).
- Paragraph 1: Hook - why you're excited about this specific role.
- Paragraph 2: Your most relevant experience and achievements.
- Paragraph 3: Why you're a great culture/mission fit for this company.
- Paragraph 4: Brief closing with call to action.
- Total length: 250-400 words.
"""

    return f"""FORMAT: {outreach_type}
- Write an appropriate professional message for this context.
- Be concise and specific.
"""


OUTREACH_SYSTEM = """You are an expert career coach helping job seekers write concise, personalized outreach.
Messages must feel human and specific to the role and company — never generic templates.
Follow the user's format instructions exactly (e.g. SUBJECT:/BODY: for email)."""


OUTREACH_EMAIL_USER = """Write a professional outreach email.

Recipient: {recipient_name} ({recipient_role})
Company: {company}
Role they are hiring for: {job_title}

About the candidate (resume summary):
{resume_summary}

{extra_context}
{applicant_context}

Output format:
SUBJECT: <compelling, specific subject line>

BODY:
<email body: greeting, 2–3 short paragraphs, professional sign-off. Sign with the candidate's name if provided above; otherwise use a neutral closing.>"""


OUTREACH_LINKEDIN_USER = """Write a short LinkedIn message (connection request or InMail style).

Recipient: {recipient_name} ({recipient_role})
Company: {company}
Role: {job_title}

About the candidate:
{resume_summary}

{extra_context}
{applicant_context}

Rules:
- No subject line.
- Under ~150 words, warm and specific.
- Reference the role or company where natural.
- End with a soft call to action."""
