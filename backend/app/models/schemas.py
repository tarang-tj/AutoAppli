from __future__ import annotations

from pydantic import BaseModel, Field


class ResumeGenerateRequest(BaseModel):
    resume_id: str
    job_description: str
    resume_text: str = ""


class ResumeGenerateResponse(BaseModel):
    id: str
    doc_type: str = "tailored_resume"
    content: str
    storage_path: str = ""
    download_url: str = ""


class OutreachGenerateRequest(BaseModel):
    message_type: str = Field(default="email", pattern="^(email|linkedin)$")
    recipient_name: str = ""
    recipient_role: str = ""
    job_title: str = ""
    company: str = ""
    resume_text: str = ""
    job_description: str = ""


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


class HealthResponse(BaseModel):
    status: str = "ok"
