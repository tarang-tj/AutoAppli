from __future__ import annotations

import uuid

from supabase import Client, create_client

from app.config import Settings


def _client(settings: Settings) -> Client:
    return create_client(settings.SUPABASE_URL.strip(), settings.SUPABASE_KEY.strip())


def _public_row(row: dict) -> dict:
    created = row["created_at"]
    if hasattr(created, "isoformat"):
        created_at = created.isoformat()
    else:
        created_at = str(created)
    return {
        "id": str(row["id"]),
        "file_name": row["file_name"],
        "storage_path": row["storage_path"],
        "parsed_text": row["parsed_text"],
        "is_primary": bool(row.get("is_primary", False)),
        "created_at": created_at,
    }


def user_has_any_resume(settings: Settings, user_id: str) -> bool:
    sb = _client(settings)
    res = (
        sb.table("user_resumes")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    return bool(res.data)


def insert_resume(
    settings: Settings,
    user_id: str,
    *,
    file_name: str,
    parsed_text: str,
    is_primary: bool,
) -> dict:
    sb = _client(settings)
    rid = str(uuid.uuid4())
    payload = {
        "id": rid,
        "user_id": user_id,
        "file_name": file_name,
        "storage_path": f"resumes/{rid}.pdf",
        "parsed_text": parsed_text,
        "is_primary": is_primary,
    }
    res = sb.table("user_resumes").insert(payload).select("*").execute()
    if not res.data:
        raise RuntimeError("resume insert failed")
    return _public_row(res.data[0])


def list_resumes(settings: Settings, user_id: str) -> list[dict]:
    sb = _client(settings)
    res = (
        sb.table("user_resumes")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    rows = [_public_row(r) for r in (res.data or [])]
    return sorted(rows, key=lambda r: r.get("created_at", ""))


def get_resume(settings: Settings, user_id: str, resume_id: str) -> dict | None:
    sb = _client(settings)
    res = (
        sb.table("user_resumes")
        .select("*")
        .eq("id", resume_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return _public_row(rows[0]) if rows else None
