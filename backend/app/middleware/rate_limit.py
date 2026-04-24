"""
Rate limiting via slowapi — Level-up Phase B2.

Keys on the user's Supabase `sub` when the request has a valid bearer
token, else falls back to the remote IP. This way a single authenticated
user can't work around the limit by rotating IPs, and unauthenticated
traffic still gets capped.
"""

from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings
from app.deps.jobs_auth import decode_supabase_user_sub


def _user_or_ip_key(request: Request) -> str:
    """Rate-limit key: user id if authenticated, else IP."""
    try:
        auth = request.headers.get("authorization") or request.headers.get(
            "Authorization"
        )
        if auth and auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
            secret = get_settings().SUPABASE_JWT_SECRET
            if secret:
                return f"user:{decode_supabase_user_sub(token, secret)}"
    except Exception:
        pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=_user_or_ip_key,
    default_limits=["100/minute"],
    headers_enabled=True,
)
