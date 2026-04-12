"""Tests for interview_service.py — unit tests for note creation and prep parsing."""
import json
import pytest
from unittest.mock import AsyncMock, patch

from app.services.interview_service import (
    generate_interview_prep,
    make_interview_note,
)


# ── make_interview_note tests ──────────────────────────────────────

def test_note_has_required_fields():
    note = make_interview_note(job_id="job-1")
    assert note["job_id"] == "job-1"
    assert note["id"].startswith("int-")
    assert note["round_name"] == "General"
    assert note["status"] == "upcoming"
    assert note["created_at"]
    assert note["updated_at"]


def test_note_custom_fields():
    note = make_interview_note(
        job_id="job-2",
        round_name="Technical",
        scheduled_at="2026-04-15T10:00:00Z",
        interviewer_name="Alice",
        notes="Review system design",
    )
    assert note["round_name"] == "Technical"
    assert note["scheduled_at"] == "2026-04-15T10:00:00Z"
    assert note["interviewer_name"] == "Alice"
    assert note["notes"] == "Review system design"


def test_note_with_prep_material():
    prep = {"talking_points": ["point 1"], "likely_questions": ["q1"]}
    note = make_interview_note(job_id="job-3", prep_material=prep)
    assert note["prep_material"] == prep


def test_note_unique_ids():
    n1 = make_interview_note(job_id="job-1")
    n2 = make_interview_note(job_id="job-1")
    assert n1["id"] != n2["id"]


def test_note_default_round_name():
    note = make_interview_note(job_id="job-1", round_name="")
    assert note["round_name"] == "General"


# ── generate_interview_prep tests ──────────────────────────────────

MOCK_PREP_RESPONSE = json.dumps({
    "company_overview": "Acme Corp builds widgets.",
    "role_insights": "The role involves building APIs.",
    "talking_points": ["Built similar system", "Led team of 5"],
    "likely_questions": ["Tell me about yourself", "Why this company?"],
    "questions_to_ask": ["What does success look like?"],
    "tips": ["Research the company", "Prepare STAR stories"],
})


@pytest.mark.asyncio
async def test_generate_prep_returns_dict():
    with patch(
        "app.services.interview_service.generate_text",
        new_callable=AsyncMock,
        return_value=MOCK_PREP_RESPONSE,
    ):
        result = await generate_interview_prep(
            job_title="Backend Engineer",
            company="Acme Corp",
        )
        assert result["company_overview"] == "Acme Corp builds widgets."
        assert len(result["talking_points"]) == 2
        assert len(result["likely_questions"]) == 2


@pytest.mark.asyncio
async def test_generate_prep_handles_backtick_wrapper():
    wrapped = f"```json\n{MOCK_PREP_RESPONSE}\n```"
    with patch(
        "app.services.interview_service.generate_text",
        new_callable=AsyncMock,
        return_value=wrapped,
    ):
        result = await generate_interview_prep(
            job_title="Data Analyst",
            company="DataCo",
        )
        assert "company_overview" in result
        assert "tips" in result


@pytest.mark.asyncio
async def test_generate_prep_with_description_and_resume():
    with patch(
        "app.services.interview_service.generate_text",
        new_callable=AsyncMock,
        return_value=MOCK_PREP_RESPONSE,
    ) as mock_gen:
        await generate_interview_prep(
            job_title="SWE",
            company="BigCo",
            job_description="Build distributed systems",
            resume_text="5 years Python experience",
        )
        call_args = mock_gen.call_args
        user_msg = call_args.kwargs["user_message"]
        assert "distributed systems" in user_msg
        assert "5 years Python" in user_msg


@pytest.mark.asyncio
async def test_generate_prep_invalid_json_raises():
    with patch(
        "app.services.interview_service.generate_text",
        new_callable=AsyncMock,
        return_value="This is not JSON at all",
    ):
        with pytest.raises(json.JSONDecodeError):
            await generate_interview_prep(
                job_title="PM",
                company="StartupX",
            )
