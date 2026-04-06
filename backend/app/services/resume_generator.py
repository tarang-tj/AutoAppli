import io
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.colors import HexColor


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

    # Heuristic: detect section headings (ALL CAPS or lines followed by dashes)
    heading_pattern = re.compile(r"^[A-Z][A-Z &/]+$")

    i = 0
    # First line is often the name
    if lines:
        elements.append(Paragraph(lines[0].strip(), name_style))
        i = 1

    # Second line might be contact info
    if i < len(lines) and (
        "@" in lines[i] or "|" in lines[i] or "linkedin" in lines[i].lower()
    ):
        elements.append(Paragraph(lines[i].strip(), contact_style))
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
        if heading_pattern.match(line) or (
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
            elements.append(Paragraph(line.title(), heading_style))
            continue

        # Bullet points
        if line.startswith(("- ", "* ", "\u2022 ")):
            bullet_text = line.lstrip("-*\u2022 ").strip()
            elements.append(
                Paragraph(f"\u2022  {bullet_text}", bullet_style)
            )
            continue

        # Regular paragraph
        elements.append(Paragraph(line, body_style))

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


async def generate_tailored_resume(resume_text: str, job_description: str) -> dict:
    """Use Claude to tailor resume text, returning a dict for ResumeGenerateResponse."""
    import uuid

    from app.prompts.resume_prompt import build_resume_prompt
    from app.services.claude_service import generate_text

    user_message = build_resume_prompt(resume_text, job_description)
    content = await generate_text(
        system=(
            "You are an expert resume writer and career coach. "
            "Produce polished, ATS-friendly resume content."
        ),
        user_message=user_message,
        max_tokens=4096,
        temperature=0.4,
    )
    doc_id = f"doc-{uuid.uuid4().hex[:12]}"
    return {
        "id": doc_id,
        "doc_type": "tailored_resume",
        "content": content,
        "storage_path": "",
        "download_url": "",
    }
