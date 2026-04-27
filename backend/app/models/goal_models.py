"""Pydantic models for the Goal Config API."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class GoalConfigRead(BaseModel):
    user_id: str
    weekly_target: int
    start_date: str  # ISO yyyy-mm-dd
    updated_at: str


class GoalConfigPatch(BaseModel):
    """All fields optional — send only what changed."""
    weekly_target: int | None = Field(default=None, gt=0, le=200)
    start_date: date | None = None
