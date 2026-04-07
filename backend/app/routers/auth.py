from typing import Annotated

import jwt
from fastapi import APIRouter, Header

from app.config import get_settings
from app.deps.jobs_auth import decode_supabase_user_sub, jobs_use_supabase

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
async def get_me(authorization: Annotated[str | None, Header()] = None):
    """
    When Supabase-backed jobs are enabled, validates the Bearer access token
    and returns the user id (`sub`). Otherwise indicates local / demo API mode.
    """
    settings = get_settings()
    if not jobs_use_supabase(settings):
        return {
            "user": None,
            "message": "API user persistence not configured (set Supabase URL, service role key, and JWT secret for jobs).",
        }

    if not authorization or not authorization.startswith("Bearer "):
        return {"user": None, "message": "No access token"}

    token = authorization.removeprefix("Bearer ").strip()
    try:
        sub = decode_supabase_user_sub(token, settings.SUPABASE_JWT_SECRET)
        return {"user": {"id": sub}, "message": None}
    except jwt.ExpiredSignatureError:
        return {"user": None, "message": "Token expired"}
    except jwt.InvalidTokenError:
        return {"user": None, "message": "Invalid token"}
