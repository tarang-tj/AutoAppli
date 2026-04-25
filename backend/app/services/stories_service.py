"""Story Library service — in-memory CRUD with optional Supabase persistence.

When Supabase credentials are available (SUPABASE_URL + SUPABASE_KEY),
operations go through the Supabase REST client and RLS enforces user
isolation at the database level.

When credentials are absent (CI, local dev without .env), the module
falls back to a per-user in-memory dict so the router and tests remain
fully functional without a live Postgres instance.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.config import Settings


# ── In-memory fallback store ─────────────────────────────────────────────────

_stories_by_user: dict[str, list[dict[str, Any]]] = {}

_DEMO_KEY = "__demo__"


def _mem_key(user_id: str | None) -> str:
    return user_id if user_id is not None else _DEMO_KEY


def _mem_store(user_id: str | None) -> list[dict[str, Any]]:
    k = _mem_key(user_id)
    if k not in _stories_by_user:
        _stories_by_user[k] = []
    return _stories_by_user[k]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Helpers ───────────────────────────────────────────────────────────────────


def _use_supabase(settings: Settings) -> bool:
    return bool(
        settings.SUPABASE_URL.strip() and settings.SUPABASE_KEY.strip()
    )


def _get_client(settings: Settings):
    """Return a Supabase client. Only call when _use_supabase() is True."""
    from supabase import create_client  # type: ignore[import-untyped]
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def _row_to_dict(row: dict[str, Any]) -> dict[str, Any]:
    """Normalise a Supabase row: ensure tags is a list."""
    tags = row.get("tags") or []
    return {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "title": row.get("title", ""),
        "tags": list(tags),
        "situation": row.get("situation", ""),
        "task": row.get("task", ""),
        "action": row.get("action", ""),
        "result": row.get("result", ""),
        "created_at": row.get("created_at", ""),
        "updated_at": row.get("updated_at", ""),
    }


# ── Public service API ────────────────────────────────────────────────────────


def list_stories(user_id: str, settings: Settings) -> list[dict[str, Any]]:
    """Return all stories owned by *user_id*, newest first."""
    if _use_supabase(settings):
        client = _get_client(settings)
        resp = (
            client.table("stories")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return [_row_to_dict(r) for r in (resp.data or [])]

    store = _mem_store(user_id)
    return list(reversed(store))


def create_story(
    user_id: str,
    title: str,
    tags: list[str],
    situation: str,
    task: str,
    action: str,
    result: str,
    settings: Settings,
) -> dict[str, Any]:
    """Insert a new story and return the created row."""
    if _use_supabase(settings):
        client = _get_client(settings)
        resp = (
            client.table("stories")
            .insert(
                {
                    "user_id": user_id,
                    "title": title,
                    "tags": tags,
                    "situation": situation,
                    "task": task,
                    "action": action,
                    "result": result,
                }
            )
            .execute()
        )
        rows = resp.data or []
        if not rows:
            raise RuntimeError("Supabase insert returned no rows")
        return _row_to_dict(rows[0])

    now = _now_iso()
    story: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "tags": list(tags),
        "situation": situation,
        "task": task,
        "action": action,
        "result": result,
        "created_at": now,
        "updated_at": now,
    }
    _mem_store(user_id).append(story)
    return story


def update_story(
    story_id: str,
    user_id: str,
    updates: dict[str, Any],
    settings: Settings,
) -> dict[str, Any] | None:
    """Partially update a story. Returns None when not found or not owned by user."""
    if _use_supabase(settings):
        client = _get_client(settings)
        resp = (
            client.table("stories")
            .update(updates)
            .eq("id", story_id)
            .eq("user_id", user_id)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return None
        return _row_to_dict(rows[0])

    store = _mem_store(user_id)
    for story in store:
        if story["id"] == story_id:
            story.update(updates)
            story["updated_at"] = _now_iso()
            return dict(story)
    return None


def delete_story(
    story_id: str,
    user_id: str,
    settings: Settings,
) -> bool:
    """Delete a story. Returns True if a row was removed, False if not found."""
    if _use_supabase(settings):
        client = _get_client(settings)
        resp = (
            client.table("stories")
            .delete()
            .eq("id", story_id)
            .eq("user_id", user_id)
            .execute()
        )
        deleted = resp.data or []
        return len(deleted) > 0

    store = _mem_store(user_id)
    before = len(store)
    kept = [s for s in store if s["id"] != story_id]
    if len(kept) == before:
        return False
    store.clear()
    store.extend(kept)
    return True
