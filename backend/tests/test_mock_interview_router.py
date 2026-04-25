"""Router tests for app/routers/mock_interview.py.

All Claude calls are patched to return deterministic strings so the suite
runs offline and never charges the real Anthropic API.

Patched call sites:
  app.services.mock_interview_service.generate_question
  app.services.mock_interview_service.generate_feedback
  app.services.mock_interview_service.generate_scorecard
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.routers import mock_interview as mock_interview_router
from app.services import mock_interview_service as svc
from app.models.mock_interview_models import DimensionScores, EndResponse

# ── Constants ──────────────────────────────────────────────────────────────

_FAKE_USER = "user-mock-interview-test"
_JD = "Build distributed systems in Python. 3+ months experience."
_MOCK_QUESTION = "Tell me about a time you debugged a hard problem."
_MOCK_QUESTION_2 = "Describe a project where you had to learn quickly."
_MOCK_FEEDBACK = "Good structure. Consider adding specific metrics to your answer."
_MOCK_SCORECARD = EndResponse(
    overall=78,
    dimensions=DimensionScores(clarity=80, structure=75, specificity=70, relevance=85),
    top_strengths=["Clear communication", "Strong STAR structure"],
    top_improvements=["Add more metrics", "Be more specific about your role"],
)

# ── Fixtures ───────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def _clear_sessions():
    """Wipe in-memory sessions before and after each test."""
    svc._sessions.clear()
    yield
    svc._sessions.clear()


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(mock_interview_router.router, prefix="/api/v1")
    return a


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    def _fake_user_id() -> str:
        return _FAKE_USER

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def unauthed_client(app: FastAPI) -> TestClient:
    """Client with real auth dependency (will 401 when Supabase is configured)."""
    with TestClient(app) as client:
        yield client


# ── Auth tests ─────────────────────────────────────────────────────────────


def test_start_session_no_auth_401(unauthed_client: TestClient):
    """No Authorization header → 401 when Supabase is configured."""
    # When Supabase env is not set, get_jobs_user_id returns None (no 401).
    # Force the dependency to raise 401 to test auth path.
    from fastapi import HTTPException

    def _raise_401():
        raise HTTPException(status_code=401, detail="Authorization required")

    app = FastAPI()
    app.include_router(mock_interview_router.router, prefix="/api/v1")
    app.dependency_overrides[get_jobs_user_id] = _raise_401

    with TestClient(app) as c:
        r = c.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "role": "swe-intern", "num_questions": 3},
        )
    assert r.status_code == 401


# ── POST /sessions ─────────────────────────────────────────────────────────


def test_start_session_returns_session_id_and_first_question(authed_client: TestClient):
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        r = authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "role": "swe-intern", "num_questions": 5},
        )
    assert r.status_code == 201, r.text
    body = r.json()
    assert "session_id" in body
    assert body["question"] == _MOCK_QUESTION
    assert body["question_index"] == 0
    assert body["total"] == 5


def test_start_session_default_num_questions(authed_client: TestClient):
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        r = authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD},
        )
    assert r.status_code == 201, r.text
    assert r.json()["total"] == 5  # default


def test_start_session_invalid_jd_422(authed_client: TestClient):
    """job_description must be at least 10 chars."""
    r = authed_client.post(
        "/api/v1/mock-interview/sessions",
        json={"job_description": "short"},
    )
    assert r.status_code == 422


# ── POST /sessions/{id}/turn ───────────────────────────────────────────────


def test_turn_returns_feedback_and_next_question(authed_client: TestClient):
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        session = authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "num_questions": 3},
        ).json()

    sid = session["session_id"]

    with (
        patch(
            "app.services.mock_interview_service.generate_feedback",
            new=AsyncMock(return_value=_MOCK_FEEDBACK),
        ),
        patch(
            "app.services.mock_interview_service.generate_question",
            new=AsyncMock(return_value=_MOCK_QUESTION_2),
        ),
    ):
        r = authed_client.post(
            f"/api/v1/mock-interview/sessions/{sid}/turn",
            json={"answer": "I traced a memory leak using pprof."},
        )

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["feedback"] == _MOCK_FEEDBACK
    assert body["next_question"] == _MOCK_QUESTION_2
    assert body["question_index"] == 1
    assert body["complete"] is False


def test_turn_increments_question_index(authed_client: TestClient):
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        session = authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "num_questions": 3},
        ).json()

    sid = session["session_id"]

    with (
        patch("app.services.mock_interview_service.generate_feedback", new=AsyncMock(return_value=_MOCK_FEEDBACK)),
        patch("app.services.mock_interview_service.generate_question", new=AsyncMock(return_value=_MOCK_QUESTION_2)),
    ):
        r1 = authed_client.post(f"/api/v1/mock-interview/sessions/{sid}/turn", json={"answer": "Answer one"})
        assert r1.json()["question_index"] == 1

    with (
        patch("app.services.mock_interview_service.generate_feedback", new=AsyncMock(return_value=_MOCK_FEEDBACK)),
        patch("app.services.mock_interview_service.generate_question", new=AsyncMock(return_value="Q3")),
    ):
        r2 = authed_client.post(f"/api/v1/mock-interview/sessions/{sid}/turn", json={"answer": "Answer two"})
        assert r2.json()["question_index"] == 2


def test_turn_complete_after_all_questions_answered(authed_client: TestClient):
    """After num_questions answers, complete=true and next_question=None."""
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        session = authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "num_questions": 2},
        ).json()

    sid = session["session_id"]

    with (
        patch("app.services.mock_interview_service.generate_feedback", new=AsyncMock(return_value=_MOCK_FEEDBACK)),
        patch("app.services.mock_interview_service.generate_question", new=AsyncMock(return_value=_MOCK_QUESTION_2)),
    ):
        authed_client.post(f"/api/v1/mock-interview/sessions/{sid}/turn", json={"answer": "A1"})

    with patch("app.services.mock_interview_service.generate_feedback", new=AsyncMock(return_value=_MOCK_FEEDBACK)):
        r = authed_client.post(f"/api/v1/mock-interview/sessions/{sid}/turn", json={"answer": "A2"})

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["complete"] is True
    assert body["next_question"] is None
    assert body["question_index"] == 2


def test_turn_unknown_session_404(authed_client: TestClient):
    r = authed_client.post(
        "/api/v1/mock-interview/sessions/nonexistent-id/turn",
        json={"answer": "Some answer"},
    )
    assert r.status_code == 404


# ── POST /sessions/{id}/end ────────────────────────────────────────────────


def test_end_session_returns_scorecard(authed_client: TestClient):
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        session = authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "num_questions": 1},
        ).json()

    sid = session["session_id"]

    with patch("app.services.mock_interview_service.generate_feedback", new=AsyncMock(return_value=_MOCK_FEEDBACK)):
        authed_client.post(f"/api/v1/mock-interview/sessions/{sid}/turn", json={"answer": "My answer"})

    with patch(
        "app.services.mock_interview_service.generate_scorecard",
        new=AsyncMock(return_value=_MOCK_SCORECARD),
    ):
        r = authed_client.post(f"/api/v1/mock-interview/sessions/{sid}/end")

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["overall"] == 78
    dims = body["dimensions"]
    assert "clarity" in dims
    assert "structure" in dims
    assert "specificity" in dims
    assert "relevance" in dims
    assert isinstance(body["top_strengths"], list)
    assert isinstance(body["top_improvements"], list)


def test_end_session_unknown_session_404(authed_client: TestClient):
    r = authed_client.post("/api/v1/mock-interview/sessions/bad-id/end")
    assert r.status_code == 404


# ── GET /sessions/{id} ────────────────────────────────────────────────────


def test_get_session_matches_state_after_writes(authed_client: TestClient):
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        session = authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "num_questions": 3},
        ).json()

    sid = session["session_id"]

    with (
        patch("app.services.mock_interview_service.generate_feedback", new=AsyncMock(return_value=_MOCK_FEEDBACK)),
        patch("app.services.mock_interview_service.generate_question", new=AsyncMock(return_value=_MOCK_QUESTION_2)),
    ):
        authed_client.post(f"/api/v1/mock-interview/sessions/{sid}/turn", json={"answer": "My detailed answer"})

    r = authed_client.get(f"/api/v1/mock-interview/sessions/{sid}")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["session_id"] == sid
    assert body["question_index"] == 1
    assert len(body["turns"]) == 1
    assert body["turns"][0]["feedback"] == _MOCK_FEEDBACK
    assert body["num_questions"] == 3


def test_get_session_unknown_404(authed_client: TestClient):
    r = authed_client.get("/api/v1/mock-interview/sessions/does-not-exist")
    assert r.status_code == 404


# ── GET /sessions (list) ──────────────────────────────────────────────────


def test_list_sessions_requires_auth(app: FastAPI):
    """list endpoint → 401 when auth dep raises."""
    from fastapi import HTTPException

    def _raise_401():
        raise HTTPException(status_code=401, detail="Authorization required")

    app.dependency_overrides[get_jobs_user_id] = _raise_401
    with TestClient(app) as c:
        r = c.get("/api/v1/mock-interview/sessions")
    assert r.status_code == 401
    app.dependency_overrides.clear()


def test_list_sessions_empty_for_new_user(authed_client: TestClient):
    """No sessions yet → returns empty list."""
    r = authed_client.get("/api/v1/mock-interview/sessions")
    assert r.status_code == 200
    assert r.json() == []


def test_list_sessions_happy_path(authed_client: TestClient):
    """After creating a session it appears in the list."""
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "role": "swe-intern", "num_questions": 2},
        )

    r = authed_client.get("/api/v1/mock-interview/sessions")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    item = items[0]
    assert "session_id" in item
    assert item["role"] == "swe-intern"
    assert item["complete"] is False
    assert item["overall_score"] is None


def test_list_sessions_returns_own_sessions_only(app: FastAPI):
    """Sessions created by user A are not visible to user B."""
    _USER_A = "user-list-test-A"
    _USER_B = "user-list-test-B"

    def _make_client(uid: str) -> TestClient:
        app.dependency_overrides[get_jobs_user_id] = lambda: uid
        return TestClient(app)

    client_a = _make_client(_USER_A)
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        client_a.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "role": "pm-intern", "num_questions": 1},
        )

    client_b = _make_client(_USER_B)
    r = client_b.get("/api/v1/mock-interview/sessions")
    assert r.status_code == 200
    assert r.json() == []
    app.dependency_overrides.clear()


def test_list_sessions_shows_overall_score_after_end(authed_client: TestClient):
    """completed session with scorecard surfaces overall_score in the list."""
    with patch(
        "app.services.mock_interview_service.generate_question",
        new=AsyncMock(return_value=_MOCK_QUESTION),
    ):
        session = authed_client.post(
            "/api/v1/mock-interview/sessions",
            json={"job_description": _JD, "role": "swe-intern", "num_questions": 1},
        ).json()

    sid = session["session_id"]

    with patch(
        "app.services.mock_interview_service.generate_feedback",
        new=AsyncMock(return_value=_MOCK_FEEDBACK),
    ):
        authed_client.post(
            f"/api/v1/mock-interview/sessions/{sid}/turn",
            json={"answer": "My answer"},
        )

    with patch(
        "app.services.mock_interview_service.generate_scorecard",
        new=AsyncMock(return_value=_MOCK_SCORECARD),
    ):
        authed_client.post(f"/api/v1/mock-interview/sessions/{sid}/end")

    r = authed_client.get("/api/v1/mock-interview/sessions")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["complete"] is True
    assert items[0]["overall_score"] == 78


# ── Supabase persistence (mocked) ─────────────────────────────────────────


def _make_supabase_settings():
    """Return a Settings-like object that triggers _use_supabase()."""
    from app.config import Settings
    s = Settings(
        SUPABASE_URL="https://fake.supabase.co",
        SUPABASE_KEY="fake-key",
        ANTHROPIC_API_KEY="fake-anthropic",
    )
    return s


def test_persisted_session_survives_memory_clear(app: FastAPI):
    """When Supabase is active, session data comes from DB not _sessions dict."""
    from app.config import get_settings

    fake_settings = _make_supabase_settings()
    session_id = "aaaaaaaa-0000-0000-0000-000000000001"

    # Build the DB row the Supabase client would return
    _db_row = {
        "id": session_id,
        "user_id": _FAKE_USER,
        "job_description": _JD,
        "role": "swe-intern",
        "num_questions": 2,
        "question_index": 0,
        "complete": False,
        "turns": [],
        "scorecard": None,
        "questions_cache": [_MOCK_QUESTION],
        "created_at": "2026-04-25T13:00:00+00:00",
    }

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [_db_row]

    with (
        patch("app.services.mock_interview_service._get_supabase_client", return_value=mock_sb),
        patch("app.services.mock_interview_service._use_supabase", return_value=True),
    ):
        state = svc._state_from_row(_db_row)

    assert state.session_id == session_id
    assert state.role == "swe-intern"
    assert state.questions == [_MOCK_QUESTION]
    assert state.turns == []
