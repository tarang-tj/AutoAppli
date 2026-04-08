from __future__ import annotations

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
    purpose = row.get("message_purpose") or "outreach"
    return {
        "id": str(row["id"]),
        "message_type": row["message_type"],
        "recipient_name": row.get("recipient_name") or "",
        "recipient_role": row.get("recipient_role"),
        "subject": row.get("subject"),
        "body": row["body"],
        "created_at": created_at,
        "message_purpose": purpose,
    }


def insert_message(
    settings: Settings,
    user_id: str,
    *,
    message_type: str,
    recipient_name: str,
    recipient_role: str | None,
    subject: str | None,
    body: str,
    message_purpose: str = "outreach",
) -> dict:
    sb = _client(settings)
    payload = {
        "user_id": user_id,
        "message_type": message_type,
        "recipient_name": recipient_name or "",
        "recipient_role": recipient_role,
        "subject": subject,
        "body": body,
        "message_purpose": message_purpose,
    }
    res = sb.table("outreach_messages").insert(payload).select("*").execute()
    if not res.data:
        raise RuntimeError("outreach insert failed")
    return _public_row(res.data[0])


def list_messages(settings: Settings, user_id: str) -> list[dict]:
    sb = _client(settings)
    res = (
        sb.table("outreach_messages")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_public_row(r) for r in (res.data or [])]


def delete_message(settings: Settings, user_id: str, message_id: str) -> bool:
    sb = _client(settings)
    existing = (
        sb.table("outreach_messages")
        .select("id")
        .eq("id", message_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not (existing.data or []):
        return False
    sb.table("outreach_messages").delete().eq("id", message_id).eq("user_id", user_id).execute()
    return True
