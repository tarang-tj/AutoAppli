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


class HealthResponse(BaseModel):
    status: str = "ok"
