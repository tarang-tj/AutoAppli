"""Mock Interview router — AI-powered turn-based interview practice.

Endpoints (mount under /api/v1 by orchestrator in main.py):
  GET  /mock-interview/sessions                    list user's sessions (history)
  POST /mock-interview/sessions                    start a new session
  POST /mock-interview/sessions/{id}/turn          submit an answer, get feedback
  POST /mock-interview/sessions/{id}/end           get scorecard
  GET  /mock-interview/sessions/{id}/resume        hydrated state for mid-session resume
  GET  /mock-interview/sessions/{id}               fetch full session state (legacy)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.deps.jobs_auth import get_jobs_user_id
from app.models.mock_interview_models import (
    EndResponse,
    ResumeResponse,
    SessionListItem,
    SessionStartRequest,
    SessionStartResponse,
    TurnRequest,
    TurnResponse,
)
from app.services import mock_interview_service as svc

router = APIRouter(tags=["mock-interview"])


@router.get("/mock-interview/sessions", response_model=list[SessionListItem])
async def list_sessions(
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Return the authenticated user's mock interview sessions, newest first (limit 50)."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authorization required")
    try:
        return await svc.list_sessions(user_id=user_id, settings=settings)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/mock-interview/sessions", response_model=SessionStartResponse, status_code=201)
async def start_session(
    req: SessionStartRequest,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Create a new mock interview session and return the first question."""
    try:
        state = await svc.create_session(
            job_description=req.job_description,
            role=req.role,
            num_questions=req.num_questions,
            user_id=user_id,
            settings=settings,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return SessionStartResponse(
        session_id=state.session_id,
        question_index=state.question_index,
        question=state.questions[0],
        total=state.num_questions,
    )


@router.post("/mock-interview/sessions/{session_id}/turn", response_model=TurnResponse)
async def submit_turn(
    session_id: str,
    req: TurnRequest,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Submit an answer, receive feedback, and get the next question (if any)."""
    try:
        feedback, next_question, new_index, complete = await svc.process_turn(
            session_id=session_id,
            answer=req.answer,
            user_id=user_id,
            settings=settings,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return TurnResponse(
        feedback=feedback,
        next_question=next_question,
        question_index=new_index,
        complete=complete,
    )


@router.post("/mock-interview/sessions/{session_id}/end", response_model=EndResponse)
async def end_session(
    session_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Generate and return the scorecard for a completed session."""
    try:
        scorecard = await svc.end_session(
            session_id=session_id,
            user_id=user_id,
            settings=settings,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return scorecard


@router.get("/mock-interview/sessions/{session_id}/resume", response_model=ResumeResponse)
async def resume_session(
    session_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Return hydrated session state for mid-session resume.

    Includes answered turns, remaining questions (regenerated if cache is
    missing), current question_index, role, and job description.
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authorization required")
    try:
        return await svc.resume_session(
            session_id=session_id,
            user_id=user_id,
            settings=settings,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/mock-interview/sessions/{session_id}")
async def get_session(
    session_id: str,
    user_id: str | None = Depends(get_jobs_user_id),
    settings: Settings = Depends(get_settings),
):
    """Return the full session state (for resume / review)."""
    try:
        if svc._use_supabase(settings, user_id):
            state = await svc.get_session_persisted(user_id, session_id, settings)  # type: ignore[arg-type]
            if state is None:
                raise KeyError(session_id)
        else:
            state = svc.get_session(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")

    return state.model_dump()
