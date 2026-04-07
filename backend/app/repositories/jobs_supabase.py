from __future__ import annotations

from datetime import datetime, timezone

from supabase import Client, create_client

from app.config import Settings
from app.utils.job_url import normalize_job_url


def _client(settings: Settings) -> Client:
    return create_client(settings.SUPABASE_URL.strip(), settings.SUPABASE_KEY.strip())


def _rank(status: str) -> int:
    order = (
        "bookmarked",
        "applied",
        "interviewing",
        "offer",
        "rejected",
        "ghosted",
    )
    try:
        return order.index(status)
    except ValueError:
        return 0


def _public_row(row: dict) -> dict:
    return {
        "id": row["id"],
        "company": row["company"],
        "title": row["title"],
        "url": row.get("url"),
        "description": row.get("description"),
        "status": row["status"],
        "source": row["source"],
        "sort_order": row.get("sort_order", 0),
        "notes": row.get("notes"),
        "applied_at": row.get("applied_at"),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _next_sort_order(sb: Client, user_id: str, status: str) -> int:
    res = (
        sb.table("jobs")
        .select("sort_order")
        .eq("user_id", user_id)
        .eq("status", status)
        .order("sort_order", desc=True)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return 0
    return int(rows[0]["sort_order"]) + 1


def create_job(
    settings: Settings,
    user_id: str,
    company: str,
    title: str,
    url: str | None,
    description: str | None,
    source: str,
) -> dict:
    sb = _client(settings)
    sort_order = _next_sort_order(sb, user_id, "bookmarked")
    payload = {
        "user_id": user_id,
        "company": company,
        "title": title,
        "url": normalize_job_url(url),
        "description": description,
        "status": "bookmarked",
        "source": source,
        "sort_order": sort_order,
    }
    res = sb.table("jobs").insert(payload).select("*").execute()
    if not res.data:
        raise RuntimeError("insert failed")
    return _public_row(res.data[0])


def list_jobs(settings: Settings, user_id: str, status: str | None) -> list[dict]:
    sb = _client(settings)
    q = sb.table("jobs").select("*").eq("user_id", user_id)
    if status:
        q = q.eq("status", status)
    res = q.execute()
    rows = [_public_row(r) for r in (res.data or [])]
    return sorted(
        rows,
        key=lambda j: (
            _rank(j["status"]),
            j.get("sort_order", 0),
            j.get("created_at", ""),
        ),
    )


def reorder_jobs(settings: Settings, user_id: str, status: str, ordered_ids: list[str]) -> None:
    sb = _client(settings)
    now = datetime.now(timezone.utc).isoformat()
    for i, jid in enumerate(ordered_ids):
        res = (
            sb.table("jobs")
            .update({"sort_order": i, "updated_at": now})
            .eq("id", jid)
            .eq("user_id", user_id)
            .eq("status", status)
            .execute()
        )
        if not res.data:
            raise KeyError(f"Unknown job id or wrong column: {jid}")


def patch_job(settings: Settings, user_id: str, job_id: str, patch: dict) -> dict:
    sb = _client(settings)
    cur = (
        sb.table("jobs")
        .select("status")
        .eq("id", job_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = cur.data or []
    if not rows:
        raise KeyError("not found")
    now = datetime.now(timezone.utc).isoformat()
    update: dict = {"updated_at": now}
    if "status" in patch and patch["status"] is not None:
        new_status = patch["status"]
        if rows[0]["status"] != new_status:
            update["status"] = new_status
            update["sort_order"] = _next_sort_order(sb, user_id, new_status)
    if "notes" in patch:
        n = patch["notes"]
        update["notes"] = None if n in ("", None) else n
    res = (
        sb.table("jobs")
        .update(update)
        .eq("id", job_id)
        .eq("user_id", user_id)
        .select("*")
        .execute()
    )
    if not res.data:
        raise KeyError("not found")
    return _public_row(res.data[0])


def delete_job(settings: Settings, user_id: str, job_id: str) -> None:
    sb = _client(settings)
    check = (
        sb.table("jobs")
        .select("id")
        .eq("id", job_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not check.data:
        raise KeyError("not found")
    sb.table("jobs").delete().eq("id", job_id).eq("user_id", user_id).execute()
