"""AI Mock Interview service — turn-based interview practice with Claude.

Architecture:
- Sessions stored in-memory keyed by UUID (user_id scoped).
- System prompt + JD use prompt-caching (cache_control: ephemeral) so
  repeated turns within a session don't re-process the JD.
- Future migration path: persist SessionState to a `mock_interview_sessions`
  Supabase table when multi-device support is needed.
"""
from __future__ import annotations

import json
import uuid
from typing import Any

from app.models.mock_interview_models import (
    DimensionScores,
    EndResponse,
    SessionState,
    TurnRecord,
)
from app.services.claude_service import _get_client
from app.config import get_settings

# ── In-memory store ────────────────────────────────────────────────────────
# Keyed by session_id. Fine for v1 (single process, Render free tier).
_sessions: dict[str, SessionState] = {}


# ── Prompt helpers ─────────────────────────────────────────────────────────

_ROLE_LABELS: dict[str, str] = {
    "swe-intern": "Software Engineering Intern",
    "swe-new-grad": "Software Engineer (New Grad)",
    "pm-intern": "Product Management Intern",
    "data-intern": "Data Science / Analytics Intern",
    "design-intern": "UX / Product Design Intern",
    "general": "General Role",
}


def _system_prompt(job_description: str, role: str, num_questions: int) -> str:
    role_label = _ROLE_LABELS.get(role, role)
    return (
        f"You are an experienced interviewer conducting a practice interview for a "
        f"{role_label} position. The candidate is a college student preparing for "
        f"internship or new-grad interviews.\n\n"
        f"Job description:\n{job_description}\n\n"
        f"Session structure:\n"
        f"- You will ask exactly {num_questions} behavioral/situational questions "
        f"relevant to this role and JD.\n"
        f"- For each candidate answer, give brief, constructive feedback "
        f"(2-4 sentences: what was strong, what could improve).\n"
        f"- Focus on STAR method, clarity, specificity, and relevance to the role.\n"
        f"- Be encouraging but honest. This is practice, not evaluation for rejection.\n\n"
        f"Important: never auto-submit anything on the candidate's behalf. "
        f"Your role is purely coaching and feedback."
    )


_QUESTION_INSTRUCTION = (
    "Generate the next interview question. "
    "Return ONLY the question text — no preamble, no numbering, no extra text."
)

_FEEDBACK_INSTRUCTION = (
    "Give brief feedback on the candidate's answer above (2-4 sentences). "
    "Mention one strength and one concrete improvement. "
    "Return ONLY the feedback text — no preamble."
)

_SCORECARD_INSTRUCTION = """
Review the full interview transcript above and return a JSON scorecard.
Return ONLY valid JSON with this exact schema — no markdown, no extra text:
{
  "overall": <int 0-100>,
  "dimensions": {
    "clarity": <int 0-100>,
    "structure": <int 0-100>,
    "specificity": <int 0-100>,
    "relevance": <int 0-100>
  },
  "top_strengths": [<str>, <str>],
  "top_improvements": [<str>, <str>]
}
"""


# ── Claude call helpers (patchable in tests) ───────────────────────────────

async def generate_question(system: str, history: list[dict[str, str]]) -> str:
    """Ask Claude for the next interview question using prompt caching."""
    client = _get_client()
    settings = get_settings()
    messages = list(history) + [{"role": "user", "content": _QUESTION_INSTRUCTION}]
    resp = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=256,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
        temperature=0.8,
    )
    return resp.content[0].text.strip()


async def generate_feedback(system: str, history: list[dict[str, str]], answer: str) -> str:
    """Ask Claude for feedback on the candidate's answer."""
    client = _get_client()
    settings = get_settings()
    messages = list(history) + [
        {"role": "user", "content": answer},
        {"role": "user", "content": _FEEDBACK_INSTRUCTION},
    ]
    resp = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=512,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
        temperature=0.6,
    )
    return resp.content[0].text.strip()


async def generate_scorecard(system: str, transcript: str) -> EndResponse:
    """Ask Claude for a scorecard from the full transcript."""
    client = _get_client()
    settings = get_settings()
    messages = [
        {"role": "user", "content": transcript},
        {"role": "user", "content": _SCORECARD_INSTRUCTION},
    ]
    resp = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=512,
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=messages,
        temperature=0.3,
    )
    raw = resp.content[0].text.strip()
    # Strip optional markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    data = json.loads(raw)
    return EndResponse(
        overall=int(data["overall"]),
        dimensions=DimensionScores(**data["dimensions"]),
        top_strengths=data["top_strengths"],
        top_improvements=data["top_improvements"],
    )


# ── Session helpers ────────────────────────────────────────────────────────

def _build_history(session: SessionState) -> list[dict[str, str]]:
    """Reconstruct Claude message history from recorded turns."""
    messages: list[dict[str, str]] = []
    for turn in session.turns:
        messages.append({"role": "assistant", "content": turn.question})
        messages.append({"role": "user", "content": turn.answer})
        messages.append({"role": "assistant", "content": turn.feedback})
    return messages


def _build_transcript(session: SessionState) -> str:
    lines: list[str] = []
    for i, turn in enumerate(session.turns, 1):
        lines.append(f"Q{i}: {turn.question}")
        lines.append(f"A: {turn.answer}")
        lines.append(f"Feedback: {turn.feedback}")
        lines.append("")
    return "\n".join(lines)


# ── Public service API ─────────────────────────────────────────────────────

async def create_session(
    job_description: str,
    role: str,
    num_questions: int,
    user_id: str | None,
) -> SessionState:
    session_id = str(uuid.uuid4())
    system = _system_prompt(job_description, role, num_questions)
    first_question = await generate_question(system, [])
    state = SessionState(
        session_id=session_id,
        user_id=user_id,
        job_description=job_description,
        role=role,
        num_questions=num_questions,
        question_index=0,
        questions=[first_question],
        turns=[],
    )
    _sessions[session_id] = state
    return state


async def process_turn(
    session_id: str,
    answer: str,
) -> tuple[str, str | None, int, bool]:
    """Record the answer, generate feedback, advance to next question.

    Returns (feedback, next_question_or_None, new_question_index, complete).
    """
    state = _sessions.get(session_id)
    if state is None:
        raise KeyError(session_id)

    current_q = state.questions[state.question_index]
    system = _system_prompt(state.job_description, state.role, state.num_questions)
    history = _build_history(state)

    feedback = await generate_feedback(
        system,
        history + [{"role": "assistant", "content": current_q}],
        answer,
    )

    state.turns.append(TurnRecord(question=current_q, answer=answer, feedback=feedback))
    new_index = state.question_index + 1
    state.question_index = new_index

    complete = new_index >= state.num_questions
    next_question: str | None = None

    if not complete:
        next_question = await generate_question(system, _build_history(state))
        state.questions.append(next_question)
    else:
        state.complete = True

    _sessions[session_id] = state
    return feedback, next_question, new_index, complete


async def end_session(session_id: str) -> EndResponse:
    """Generate and cache the scorecard for the session."""
    state = _sessions.get(session_id)
    if state is None:
        raise KeyError(session_id)

    if state.scorecard is not None:
        return state.scorecard

    system = _system_prompt(state.job_description, state.role, state.num_questions)
    transcript = _build_transcript(state)
    scorecard = await generate_scorecard(system, transcript)
    state.scorecard = scorecard
    _sessions[session_id] = state
    return scorecard


def get_session(session_id: str) -> SessionState:
    state = _sessions.get(session_id)
    if state is None:
        raise KeyError(session_id)
    return state
