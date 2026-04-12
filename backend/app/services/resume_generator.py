import base64
import io
import json
import logging
import re
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.colors import HexColor

from app.models.schemas import ResumeReviewResponse
from app.services.resume_text import parse_resume_review_json, sanitize_tailored_resume_text

logger = logging.getLogger(__name__)

# Phrases the model may use instead of strict ALL CAPS (normalized lowercase).
_SECTION_HEADING_PHRASES = frozenset(
    {
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "education",
        "skills",
        "technical skills",
        "core competencies",
        "projects",
        "summary",
        "professional summary",
        "profile",
        "objective",
        "certifications",
        "awards",
        "honors",
        "publications",
        "volunteer",
        "volunteer experience",
        "references",
        "interests",
        "languages",
        "leadership",
    }
)


def _para_xml(text: str) -> str:
    """Escape text for ReportLab Paragraph (subset of HTML)."""
    return escape(text, entities={"'": "&apos;", '"': "&quot;"})


def _is_section_heading_line(line: str, all_caps_pattern: re.Pattern[str]) -> bool:
    s = line.strip()
    if not s or len(s) > 72:
        return False
    if all_caps_pattern.match(s):
        return True
    return s.lower() in _SECTION_HEADING_PHRASES


def generate_resume_pdf(tailored_text: str, candidate_name: str = "Candidate") -> bytes:
    """
    Generate a clean, ATS-friendly PDF resume from tailored text.

    The tailored_text is expected to contain section headings in ALL CAPS or
    Title Case on their own lines, followed by content paragraphs.

    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    name_style = ParagraphStyle(
        "ResumeName",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        spaceAfter=4,
        textColor=HexColor("#1a1a1a"),
    )

    contact_style = ParagraphStyle(
        "ResumeContact",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
        spaceAfter=12,
        textColor=HexColor("#555555"),
    )

    heading_style = ParagraphStyle(
        "ResumeHeading",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        spaceBefore=12,
        spaceAfter=4,
        textColor=HexColor("#2c3e50"),
        fontName="Helvetica-Bold",
    )

    body_style = ParagraphStyle(
        "ResumeBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        spaceAfter=4,
        textColor=HexColor("#333333"),
    )

    bullet_style = ParagraphStyle(
        "ResumeBullet",
        parent=body_style,
        leftIndent=18,
        bulletIndent=6,
        spaceAfter=2,
    )

    elements: list = []
    lines = tailored_text.strip().split("\n")

    # Heuristic: detect section headings (ALL CAPS or known phrases)
    heading_pattern = re.compile(r"^[A-Z][A-Z &/'\-]+$")

    i = 0
    # First line is often the name (override when caller passes a real name)
    if lines:
        first = lines[0].strip()
        if candidate_name and candidate_name != "Candidate":
            elements.append(Paragraph(_para_xml(candidate_name), name_style))
        else:
            elements.append(Paragraph(_para_xml(first), name_style))
        i = 1

    # Second line might be contact info
    if i < len(lines) and (
        "@" in lines[i] or "|" in lines[i] or "linkedin" in lines[i].lower()
    ):
        elements.append(Paragraph(_para_xml(lines[i].strip()), contact_style))
        i += 1

    elements.append(
        HRFlowable(width="100%", thickness=1, color=HexColor("#cccccc"), spaceAfter=8)
    )

    while i < len(lines):
        line = lines[i].strip()
        i += 1

        if not line:
            continue

        # Check for section heading
        if _is_section_heading_line(line, heading_pattern) or (
            i < len(lines) and lines[i].strip().startswith("---")
        ):
            # Skip separator line if present
            if i < len(lines) and lines[i].strip().startswith("---"):
                i += 1
            elements.append(
                HRFlowable(
                    width="100%",
                    thickness=0.5,
                    color=HexColor("#dddddd"),
                    spaceBefore=6,
                    spaceAfter=2,
                )
            )
            display = line.title() if line.isupper() else line
            elements.append(Paragraph(_para_xml(display), heading_style))
            continue

        # Bullet points
        if line.startswith(("- ", "* ", "\u2022 ")):
            bullet_text = line.lstrip("-*\u2022 ").strip()
            elements.append(
                Paragraph(f"\u2022  {_para_xml(bullet_text)}", bullet_style)
            )
            continue

        # Regular paragraph
        elements.append(Paragraph(_para_xml(line), body_style))

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


def generate_resume_pdf_from_sections(sections: dict, metadata: dict | None = None) -> bytes:
    """
    Generate a PDF from structured resume sections dict.
    Converts sections back to text and delegates to generate_resume_pdf.
    """
    parts: list[str] = []

    # Header / name
    if "header" in sections:
        parts.append(sections["header"])
        parts.append("")

    for heading, content in sections.items():
        if heading in ("header", "full_text"):
            continue
        parts.append(heading.upper())
        parts.append(content)
        parts.append("")

    if "full_text" in sections and len(sections) == 1:
        return generate_resume_pdf(sections["full_text"])

    combined = "\n".join(parts)
    name = metadata.get("candidate_name", "Candidate") if metadata else "Candidate"
    return generate_resume_pdf(combined, candidate_name=name)


async def generate_tailored_resume(
    resume_text: str,
    job_description: str,
    *,
    instructions: str | None = None,
    include_pdf: bool = False,
) -> dict:
    """Use Claude to tailor resume text, returning a dict for ResumeGenerateResponse."""
    import uuid

    from app.prompts.resume_prompt import build_resume_prompt
    from app.services.claude_service import generate_text

    extra = (instructions or "").strip() or None
    user_message = build_resume_prompt(resume_text, job_description, instructions=extra)
    raw_content = await generate_text(
        system=(
            "You are an expert resume writer and career coach. "
            "Produce polished, ATS-friendly resume content."
        ),
        user_message=user_message,
        max_tokens=4096,
        temperature=0.4,
    )
    content = sanitize_tailored_resume_text(raw_content)
    doc_id = f"doc-{uuid.uuid4().hex[:12]}"
    out: dict = {
        "id": doc_id,
        "doc_type": "tailored_resume",
        "content": content,
        "storage_path": "",
        "download_url": "",
        "pdf_base64": None,
    }
    if include_pdf:
        try:
            lines = content.strip().split("\n")
            candidate_name = (lines[0].strip() if lines else "") or "Candidate"
            pdf_bytes = generate_resume_pdf(content, candidate_name=candidate_name)
            out["pdf_base64"] = base64.standard_b64encode(pdf_bytes).decode("ascii")
        except Exception:
            logger.exception("Tailored resume PDF generation failed")
            out["pdf_base64"] = None
    return out


async def generate_resume_review(resume_text: str) -> ResumeReviewResponse:
    """Structured ATS-oriented feedback for the given resume plain text."""
    import uuid

    from app.prompts.resume_prompt import build_resume_review_prompt
    from app.services.claude_service import generate_text

    user_message = build_resume_review_prompt(resume_text)
    raw = await generate_text(
        system=(
            "You are an expert resume reviewer. Reply with only valid JSON as specified, "
            "no markdown fences, no commentary."
        ),
        user_message=user_message,
        max_tokens=2048,
        temperature=0.25,
    )
    try:
        parsed = parse_resume_review_json(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Resume review JSON parse failed: %s", exc)
        raise RuntimeError("Could not parse resume review from the model") from exc

    review_id = f"rev-{uuid.uuid4().hex[:12]}"
    parsed.pop("id", None)
    try:
        return ResumeReviewResponse.model_validate({"id": review_id, **parsed})
    except Exception as exc:
        logger.warning("Resume review validation failed: %s", exc)
        raise RuntimeError("Resume review response was incomplete or invalid") from exc
