from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ResumeGenerateRequest(BaseModel):
    resume_id: str
    job_description: str
    resume_text: str = ""
    instructions: str = ""
    include_pdf: bool = True


class ResumeGenerateResponse(BaseModel):
    id: str
    doc_type: str = "tailored_resume"
    content: str
    storage_path: str = ""
    download_url: str = ""
    pdf_base64: str | None = None


class ResumeReviewRequest(BaseModel):
    resume_id: str = ""
    resume_text: str = ""


class ResumeReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    overall_score: int = Field(ge=1, le=10, default=5)
    ats_score: int = Field(ge=1, le=10, default=5)
    strengths: list[str] = Field(default_factory=list)
    improvements: list[str] = Field(default_factory=list)
    ats_issues: list[str] = Field(default_factory=list)
    missing_sections: list[str] = Field(default_factory=list)
    keyword_suggestions: list[str] = Field(default_factory=list)

    @field_validator("overall_score", "ats_score", mode="before")
    @classmethod
    def coerce_score(cls, v: object) -> int:
        if v is None:
            return 5
        try:
            n = int(round(float(v)))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return 5
        return max(1, min(10, n))

    @field_validator(
        "strengths",
        "improvements",
        "ats_issues",
        "missing_sections",
        "keyword_suggestions",
        mode="before",
    )
    @classmethod
    def coerce_str_list(cls, v: object) -> list[str]:
        if v is None:
            return []
        if isinstance(v, str):
            return [v.strip()] if v.strip() else []
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        return []


class OutreachGenerateRequest(BaseModel):
    message_type: str = Field(default="email", pattern="^(email|linkedin)$")
    recipient_name: str = ""
    recipient_role: str = ""
    job_title: str = ""
    company: str = ""
    resume_text: str = ""
    job_description: str = ""
    applicant_name: str = ""


class OutreachGenerateResponse(BaseModel):
    id: str
    message_type: str
    recipient_name: str
    recipient_role: str | None = None
    subject: str | None = None
    body: str
    created_at: str
    message_purpose: str = "outreach"


class JobSearchResult(BaseModel):
    title: str
    company: str
    location: str | None = None
    url: str
    description_snippet: str | None = None
    posted_date: str | None = None
    salary: str | None = None
    source: str = "unknown"


class SearchRequest(BaseModel):
    query: str
    location: str = ""
    remote_only: bool = False
    page: int = 1
    per_page: int = Field(default=20, ge=1, le=50)


class ProfileResponse(BaseModel):
    display_name: str = ""
    headline: str = ""
    linkedin_url: str = ""
    updated_at: str | None = None


class ProfilePatch(BaseModel):
    display_name: str | None = None
    headline: str | None = None
    linkedin_url: str | None = None


class SavedGeneratedDocument(BaseModel):
    id: str
    doc_type: str = "tailored_resume"
    title: str
    resume_id: str | None = None
    job_description_excerpt: str = ""
    content: str
    created_at: str


class ThankYouRequest(BaseModel):
    """Post-interview thank-you email draft."""

    job_id: str | None = None
    job_title: str = ""
    company: str = ""
    interviewer_name: str | None = None
    interview_notes: str | None = None


class ThankYouResponse(BaseModel):
    subject: str
    body: str
    saved_outreach_id: str | None = None


class KeywordCoverageDetail(BaseModel):
    score: int = Field(ge=0, le=100, default=0)
    matched: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    total_keywords: int = 0


class HallucinationCheckDetail(BaseModel):
    score: int = Field(ge=0, le=100, default=100)
    hallucinated_skills: list[str] = Field(default_factory=list)
    hallucinated_credentials: list[str] = Field(default_factory=list)


class ChangeDeltaDetail(BaseModel):
    score: int = Field(ge=0, le=100, default=0)
    change_percent: float = 0.0
    similarity_ratio: float = 0.0
    verdict: str = ""
    added_sentences: int = 0
    removed_sentences: int = 0


class ResumeEvalResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100, default=0)
    keyword_coverage: KeywordCoverageDetail = Field(default_factory=KeywordCoverageDetail)
    hallucination_check: HallucinationCheckDetail = Field(default_factory=HallucinationCheckDetail)
    change_delta: ChangeDeltaDetail = Field(default_factory=ChangeDeltaDetail)


class ResumeEvalRequest(BaseModel):
    """Evaluate a tailored resume against original + JD."""
    original_resume_text: str
    tailored_resume_text: str
    job_description: str


class ResumeGenerateWithEvalResponse(BaseModel):
    """Extended generate response that includes eval scores."""
    id: str
    doc_type: str = "tailored_resume"
    content: str
    storage_path: str = ""
    download_url: str = ""
    pdf_base64: str | None = None
    eval_result: ResumeEvalResponse | None = None


class HealthResponse(BaseModel):
    status: str = "ok"


# ── Interview prep & notes ─────────────────────────────────────────

class InterviewPrepRequest(BaseModel):
    job_title: str
    company: str
    job_description: str = ""
    resume_text: str = ""


class InterviewNoteCreate(BaseModel):
    job_id: str
    round_name: str = "General"
    scheduled_at: str | None = None
    interviewer_name: str = ""
    notes: str = ""
    prep_material: dict | None = None


class InterviewNoteUpdate(BaseModel):
    round_name: str | None = None
    scheduled_at: str | None = None
    interviewer_name: str | None = None
    notes: str | None = None
    prep_material: dict | None = None
    status: str | None = None


# ── Notifications & reminders ─────────────────────────────────────

class ReminderCreate(BaseModel):
    job_id: str | None = None
    reminder_type: str = "custom"
    title: str = ""
    message: str = ""
    due_at: str | None = None


class ReminderUpdate(BaseModel):
    title: str | None = None
    message: str | None = None
    due_at: str | None = None
    is_read: bool | None = None
    is_dismissed: bool | None = None


# ── Salary & compensation ─────────────────────────────────────────

class CompensationCreate(BaseModel):
    job_id: str | None = None
    base_salary: float = 0
    bonus: float = 0
    equity_value: float = 0
    signing_bonus: float = 0
    benefits_value: float = 0
    currency: str = "USD"
    pay_period: str = "annual"
    notes: str = ""


class CompensationUpdate(BaseModel):
    base_salary: float | None = None
    bonus: float | None = None
    equity_value: float | None = None
    signing_bonus: float | None = None
    benefits_value: float | None = None
    currency: str | None = None
    pay_period: str | None = None
    notes: str | None = None


# ── Contacts CRM ─────────────────────────────────────────────────

class ContactCreate(BaseModel):
    job_id: str | None = None
    name: str
    role: str = ""
    company: str = ""
    email: str = ""
    phone: str = ""
    linkedin_url: str = ""
    relationship: str = "recruiter"
    notes: str = ""


class ContactUpdate(BaseModel):
    name: str | None = None
    role: str | None = None
    company: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin_url: str | None = None
    relationship: str | None = None
    notes: str | None = None
    job_id: str | None = None
    last_contacted_at: str | None = None


class InteractionCreate(BaseModel):
    interaction_type: str = "email"
    summary: str = ""
    occurred_at: str | None = None


# ── Application timeline ─────────────────────────────────────────

class TimelineEventCreate(BaseModel):
    job_id: str
    event_type: str = "note"
    title: str = ""
    description: str = ""
    occurred_at: str | None = None
