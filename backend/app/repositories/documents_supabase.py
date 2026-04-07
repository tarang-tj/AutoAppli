from __future__ import annotations

from supabase import Client, create_client

from app.config import Settings

_MAX_CONTENT_LEN = 120_000
_MAX_EXCERPT = 2_000
_MAX_TITLE = 200


def _client(settings: Settings) -> Client:
    return create_client(settings.SUPABASE_URL.strip(), settings.SUPABASE_KEY.strip())


def _title_from_jd(job_description: str) -> str:
    one = " ".join(job_description.strip().split())
    if not one:
        return "Tailored resume"
    return one[:_MAX_TITLE] + ("…" if len(one) > _MAX_TITLE else "")


def _public_row(row: dict) -> dict:
    created = row["created_at"]
    if hasattr(created, "isoformat"):
        created_at = created.isoformat()
    else:
        created_at = str(created)
    return {
        "id": str(row["id"]),
        "doc_type": row.get("doc_type") or "tailored_resume",
        "title": row.get("title") or "",
        "resume_id": row.get("resume_id"),
        "job_description_excerpt": row.get("job_description_excerpt") or "",
        "content": row["content"],
        "created_at": created_at,
    }


def insert_tailored_resume(
    settings: Settings,
    user_id: str,
    *,
    resume_id: str | None,
    job_description: str,
    content: str,
) -> dict | None:
    text = (content or "").strip()
    if not text:
        return None
    if len(text) > _MAX_CONTENT_LEN:
        text = text[:_MAX_CONTENT_LEN]
    jd = (job_description or "").strip()
    excerpt = jd[:_MAX_EXCERPT] + ("…" if len(jd) > _MAX_EXCERPT else "")
    sb = _client(settings)
    payload = {
        "user_id": user_id,
        "doc_type": "tailored_resume",
        "title": _title_from_jd(jd),
        "resume_id": resume_id,
        "job_description_excerpt": excerpt,
        "content": text,
    }
    res = sb.table("generated_documents").insert(payload).select("*").execute()
    if not res.data:
        raise RuntimeError("generated document insert failed")
    return _public_row(res.data[0])


def list_documents(settings: Settings, user_id: str, limit: int = 50) -> list[dict]:
    sb = _client(settings)
    lim = max(1, min(limit, 100))
    res = (
        sb.table("generated_documents")
        .select("id, doc_type, title, resume_id, job_description_excerpt, content, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(lim)
        .execute()
    )
    return [_public_row(r) for r in (res.data or [])]
