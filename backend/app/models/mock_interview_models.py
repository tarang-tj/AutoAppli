"""Pydantic models for the AI Mock Interview feature.

v1 uses in-memory session storage (no Supabase migration).
Future migration path: add a `mock_interview_sessions` table and
`mock_interview_turns` table; move SessionState persistence there.
"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class SessionStartRequest(BaseModel):
    job_description: str = Field(..., min_length=10)
    role: str = Field(default="swe-intern")
    num_questions: int = Field(default=5, ge=1, le=20)


class SessionStartResponse(BaseModel):
    session_id: str
    question_index: int
    question: str
    total: int


class TurnRequest(BaseModel):
    answer: str = Field(..., min_length=1)


class TurnResponse(BaseModel):
    feedback: str
    next_question: str | None
    question_index: int
    complete: bool


class DimensionScores(BaseModel):
    clarity: int = Field(..., ge=0, le=100)
    structure: int = Field(..., ge=0, le=100)
    specificity: int = Field(..., ge=0, le=100)
    relevance: int = Field(..., ge=0, le=100)


class EndResponse(BaseModel):
    overall: int = Field(..., ge=0, le=100)
    dimensions: DimensionScores
    top_strengths: list[str]
    top_improvements: list[str]


class TurnRecord(BaseModel):
    question: str
    answer: str
    feedback: str


class SessionState(BaseModel):
    session_id: str
    user_id: str | None
    job_description: str
    role: str
    num_questions: int
    question_index: int
    questions: list[str]
    turns: list[TurnRecord]
    complete: bool = False
    scorecard: EndResponse | None = None

    model_config = {"arbitrary_types_allowed": True}


class SessionListItem(BaseModel):
    """Summary row returned by GET /mock-interview/sessions (history list)."""

    session_id: str
    role: str
    complete: bool
    overall_score: int | None
    created_at: str
