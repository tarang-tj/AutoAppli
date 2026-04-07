from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException

from app.config import Settings, get_settings


def jobs_use_supabase(settings: Settings) -> bool:
    return bool(
        settings.SUPABASE_URL.strip()
        and settings.SUPABASE_KEY.strip()
        and settings.SUPABASE_JWT_SECRET.strip()
    )


def decode_supabase_user_sub(token: str, jwt_secret: str) -> str:
    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise
    except jwt.InvalidAudienceError:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except jwt.InvalidTokenError:
        raise
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise jwt.InvalidTokenError("missing sub")
    return sub


def get_optional_user_id(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> str | None:
    """Same JWT as jobs, but never 401 — used when persistence is optional (e.g. search)."""
    if not jobs_use_supabase(settings):
        return None
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return decode_supabase_user_sub(token, settings.SUPABASE_JWT_SECRET)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def get_jobs_user_id(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> str | None:
    if not jobs_use_supabase(settings):
        return None
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return decode_supabase_user_sub(token, settings.SUPABASE_JWT_SECRET)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired") from None
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token") from None
