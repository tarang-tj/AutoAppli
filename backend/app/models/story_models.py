"""Pydantic models for the Story Library CRUD API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

StoryTag = Literal[
    "leadership",
    "conflict",
    "technical",
    "failure",
    "ambiguity",
    "deadline",
    "teamwork",
    "ownership",
    "communication",
    "creativity",
]

VALID_STORY_TAGS: frozenset[str] = frozenset(StoryTag.__args__)  # type: ignore[attr-defined]


class StoryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    tags: list[StoryTag] = Field(default_factory=list)
    situation: str = Field(default="")
    task: str = Field(default="")
    action: str = Field(default="")
    result: str = Field(default="")


class StoryUpdate(BaseModel):
    """All fields optional — send only what changed."""
    title: str | None = Field(default=None, min_length=1, max_length=500)
    tags: list[StoryTag] | None = None
    situation: str | None = None
    task: str | None = None
    action: str | None = None
    result: str | None = None


class StoryRead(BaseModel):
    id: str
    user_id: str
    title: str
    tags: list[str]
    situation: str
    task: str
    action: str
    result: str
    created_at: str
    updated_at: str
