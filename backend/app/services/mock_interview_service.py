"""AI Mock Interview service — turn-based interview practice with Claude.

Architecture:
- Dual-mode: when Supabase credentials are available and user_id is set,
  sessions are persisted to `mock_interview_sessions` table. Otherwise falls
  back to in-memory dict (useful for tests and local dev without .env).
- System prompt + JD use prompt-caching (cache_control: ephemeral) so
  repeated turns within a session don't re-process the JD.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.models.mock_interview_models import (
    DimensionScores,
    EndResponse,
    SessionListItem,
    SessionState,
    TurnRecord,
)
from app.services.claude_service import _get_client
from app.config import Settings, get_settings

# ── In-memory fallback store ───────────────────────────────────────────────
# Keyed by session_id. Used when Supabase credentials are absent.
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


# ── Supabase helpers ───────────────────────────────────────────────────────

def _use_supabase(settings: Settings, user_id: str | None) -> bool:
    """Return True only when Supabase is configured AND a user_id is present."""
    return bool(
        user_id
        and settings.SUPABASE_URL.strip()
        and settings.SUPABASE_KEY.strip()
    )


def _get_supabase_client(settings: Settings):
    """Return a Supabase client. Only call when _use_supabase() is True."""
    from supabase import create_client  # type: ignore[import-untyped]
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def _state_from_row(row: dict[str, Any]) -> SessionState:
    """Convert a Supabase DB row back into a SessionState."""
    turns_raw = row.get("turns") or []
    turns = [TurnRecord(**t) for t in turns_raw]

    scorecard: EndResponse | None = None
    if row.get("scorecard"):
        sc = row["scorecard"]
        scorecard = EndResponse(
            overall=int(sc["overall"]),
            dimensions=DimensionScores(**sc["dimensions"]),
            top_strengths=sc["top_strengths"],
            top_improvements=sc["top_improvements"],
        )

    # Reconstruct questions list from turns; first question is stored separately
    # in the questions_cache field if present, else rebuild from turns.
    questions_cache = row.get("questions_cache") or []
    if not questions_cache:
        # Rebuild from turns for backwards compat
        questions_cache = [t.question for t in turns]

    return SessionState(
        session_id=str(row["id"]),
        user_id=str(row["user_id"]),
        job_description=row["job_description"],
        role=row["role"],
        num_questions=int(row["num_questions"]),
        question_index=int(row["question_index"]),
        questions=questions_cache,
        turns=turns,
        complete=bool(row.get("complete", False)),
        scorecard=scorecard,
    )


async def _persist_session(state: SessionState, settings: Settings) -> None:
    """Upsert the full session state to Supabase."""
    client = _get_supabase_client(settings)
    turns_data = [t.model_dump() for t in state.turns]
    scorecard_data = None
    if state.scorecard is not None:
        scorecard_data = state.scorecard.model_dump()

    row: dict[str, Any] = {
        "id": state.session_id,
        "user_id": state.user_id,
        "job_description": state.job_description,
        "role": state.role,
        "num_questions": state.num_questions,
        "question_index": state.question_index,
        "complete": state.complete,
        "turns": turns_data,
        "scorecard": scorecard_data,
    }
    client.table("mock_interview_sessions").upsert(row).execute()


# ── Public service API ─────────────────────────────────────────────────────

async def create_session(
    job_description: str,
    role: str,
    num_questions: int,
    user_id: str | None,
    settings: Settings | None = None,
) -> SessionState:
    if settings is None:
        settings = get_settings()

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

    if _use_supabase(settings, user_id):
        await _persist_session(state, settings)
    else:
        _sessions[session_id] = state

    return state


async def process_turn(
    session_id: str,
    answer: str,
    user_id: str | None = None,
    settings: Settings | None = None,
) -> tuple[str, str | None, int, bool]:
    """Record the answer, generate feedback, advance to next question.

    Returns (feedback, next_question_or_None, new_question_index, complete).
    """
    if settings is None:
        settings = get_settings()

    if _use_supabase(settings, user_id):
        state = await get_session_persisted(user_id, session_id, settings)  # type: ignore[arg-type]
        if state is None:
            raise KeyError(session_id)
    else:
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

    if _use_supabase(settings, user_id):
        await _persist_session(state, settings)
    else:
        _sessions[session_id] = state

    return feedback, next_question, new_index, complete


async def end_session(
    session_id: str,
    user_id: str | None = None,
    settings: Settings | None = None,
) -> EndResponse:
    """Generate and cache the scorecard for the session."""
    if settings is None:
        settings = get_settings()

    if _use_supabase(settings, user_id):
        state = await get_session_persisted(user_id, session_id, settings)  # type: ignore[arg-type]
        if state is None:
            raise KeyError(session_id)
    else:
        state = _sessions.get(session_id)
        if state is None:
            raise KeyError(session_id)

    if state.scorecard is not None:
        return state.scorecard

    system = _system_prompt(state.job_description, state.role, state.num_questions)
    transcript = _build_transcript(state)
    scorecard = await generate_scorecard(system, transcript)
    state.scorecard = scorecard

    if _use_supabase(settings, user_id):
        await _persist_session(state, settings)
    else:
        _sessions[session_id] = state

    return scorecard


def get_session(session_id: str) -> SessionState:
    """Retrieve session from in-memory store (fallback path)."""
    state = _sessions.get(session_id)
    if state is None:
        raise KeyError(session_id)
    return state


async def get_session_persisted(
    user_id: str,
    session_id: str,
    settings: Settings | None = None,
) -> SessionState | None:
    """Fetch a session from Supabase, enforcing user ownership. Returns None if not found."""
    if settings is None:
        settings = get_settings()
    client = _get_supabase_client(settings)
    resp = (
        client.table("mock_interview_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = resp.data or []
    if not rows:
        return None
    return _state_from_row(rows[0])


async def list_sessions(
    user_id: str,
    settings: Settings | None = None,
    limit: int = 50,
) -> list[SessionListItem]:
    """Return recent sessions for a user, newest first. Uses Supabase when available."""
    if settings is None:
        settings = get_settings()

    if _use_supabase(settings, user_id):
        client = _get_supabase_client(settings)
        resp = (
            client.table("mock_interview_sessions")
            .select("id, role, complete, scorecard, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = resp.data or []
        result: list[SessionListItem] = []
        for row in rows:
            overall: int | None = None
            if row.get("scorecard") and isinstance(row["scorecard"], dict):
                overall = row["scorecard"].get("overall")
            result.append(
                SessionListItem(
                    session_id=str(row["id"]),
                    role=row["role"],
                    complete=bool(row.get("complete", False)),
                    overall_score=overall,
                    created_at=row.get("created_at", ""),
                )
            )
        return result

    # In-memory fallback: scan all sessions belonging to the user
    user_sessions = [s for s in _sessions.values() if s.user_id == user_id]
    user_sessions.sort(key=lambda s: s.session_id, reverse=True)
    return [
        SessionListItem(
            session_id=s.session_id,
            role=s.role,
            complete=s.complete,
            overall_score=s.scorecard.overall if s.scorecard else None,
            created_at="",
        )
        for s in user_sessions[:limit]
    ]
