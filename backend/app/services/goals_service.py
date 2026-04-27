"""Goal Config service — get/upsert with optional Supabase persistence.

When Supabase credentials are absent (CI, local dev), falls back to an
in-memory per-user dict so router + tests stay fully hermetic.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.config import Settings


# ── In-memory fallback store ─────────────────────────────────────────────────

_goals_by_user: dict[str, dict[str, Any]] = {}


def _mem_key(user_id: str) -> str:
    return user_id


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _last_monday() -> str:
    """Returns ISO date string for the most recent Monday (UTC)."""
    today = date.today()
    offset = today.weekday()  # Monday=0, Sunday=6
    monday = today - timedelta(days=offset)
    return monday.isoformat()


def _default_row(user_id: str) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "weekly_target": 10,
        "start_date": _last_monday(),
        "updated_at": _now_iso(),
    }


# ── Helpers ───────────────────────────────────────────────────────────────────


def _use_supabase(settings: Settings) -> bool:
    return bool(
        settings.SUPABASE_URL.strip() and settings.SUPABASE_KEY.strip()
    )


def _get_client(settings: Settings):
    from supabase import create_client  # type: ignore[import-untyped]
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def _row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    start = row.get("start_date", "")
    # Supabase returns date as string; normalise to yyyy-mm-dd.
    if hasattr(start, "isoformat"):
        start = start.isoformat()
    elif isinstance(start, str) and "T" in start:
        start = start[:10]
    return {
        "user_id": str(row["user_id"]),
        "weekly_target": int(row.get("weekly_target", 10)),
        "start_date": str(start),
        "updated_at": str(row.get("updated_at", "")),
    }


# ── Public service API ────────────────────────────────────────────────────────


def get_or_create(user_id: str, settings: Settings) -> dict[str, Any]:
    """Return the user's goal config, creating a default row if none exists."""
    if _use_supabase(settings):
        client = _get_client(settings)
        resp = (
            client.table("goal_configs")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if rows:
            return _row_to_dict(rows[0])
        # First call — insert default.
        default = {
            "user_id": user_id,
            "weekly_target": 10,
            "start_date": _last_monday(),
        }
        ins = client.table("goal_configs").insert(default).execute()
        created = (ins.data or [{}])[0]
        return _row_to_dict(created) if created else _row_to_dict(default | {"updated_at": _now_iso()})

    # In-memory fallback.
    key = _mem_key(user_id)
    if key not in _goals_by_user:
        _goals_by_user[key] = _default_row(user_id)
    return dict(_goals_by_user[key])


def patch(user_id: str, updates: dict[str, Any], settings: Settings) -> dict[str, Any]:
    """Partially update goal config. Creates default first if row is absent."""
    # Ensure row exists.
    get_or_create(user_id, settings)

    if _use_supabase(settings):
        client = _get_client(settings)
        resp = (
            client.table("goal_configs")
            .update(updates)
            .eq("user_id", user_id)
            .execute()
        )
        rows = resp.data or []
        if rows:
            return _row_to_dict(rows[0])
        # Fallback: re-fetch after update (some Supabase configs return empty on update).
        return get_or_create(user_id, settings)

    key = _mem_key(user_id)
    _goals_by_user[key].update(updates)
    _goals_by_user[key]["updated_at"] = _now_iso()
    return dict(_goals_by_user[key])


def _clear_mem_store(user_id: str) -> None:
    """Test helper — wipe in-memory record for a user."""
    _goals_by_user.pop(_mem_key(user_id), None)
