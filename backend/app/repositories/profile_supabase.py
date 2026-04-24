from __future__ import annotations

from datetime import datetime, timezone

from supabase import Client, create_client

from app.config import Settings


def _client(settings: Settings) -> Client:
    return create_client(settings.SUPABASE_URL.strip(), settings.SUPABASE_KEY.strip())


def _public_row(row: dict) -> dict:
    updated = row.get("updated_at")
    if updated is None:
        updated_at = None
    elif hasattr(updated, "isoformat"):
        updated_at = updated.isoformat()
    else:
        updated_at = str(updated)
    return {
        "display_name": row.get("display_name") or "",
        "headline": row.get("headline") or "",
        "linkedin_url": row.get("linkedin_url") or "",
        "phone": row.get("phone") or "",
        "location": row.get("location") or "",
        "portfolio_url": row.get("portfolio_url") or "",
        "bio": row.get("bio") or "",
        "remote_preference": row.get("remote_preference") or None,
        "updated_at": updated_at,
    }


def get_profile(settings: Settings, user_id: str) -> dict:
    sb = _client(settings)
    res = (
        sb.table("profiles")
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return {
            "display_name": "",
            "headline": "",
            "linkedin_url": "",
            "updated_at": None,
        }
    return _public_row(rows[0])


def patch_profile(settings: Settings, user_id: str, patch: dict) -> dict:
    sb = _client(settings)
    cur = get_profile(settings, user_id)
    display_name = cur["display_name"]
    headline = cur["headline"]
    linkedin_url = cur["linkedin_url"]
    phone = cur.get("phone") or ""
    location = cur.get("location") or ""
    portfolio_url = cur.get("portfolio_url") or ""
    bio = cur.get("bio") or ""
    remote_preference = cur.get("remote_preference")

    if "display_name" in patch and patch["display_name"] is not None:
        display_name = str(patch["display_name"]).strip()[:200]
    if "headline" in patch and patch["headline"] is not None:
        headline = str(patch["headline"]).strip()[:300]
    if "linkedin_url" in patch and patch["linkedin_url"] is not None:
        linkedin_url = str(patch["linkedin_url"]).strip()[:500]
    if "phone" in patch and patch["phone"] is not None:
        phone = str(patch["phone"]).strip()[:40]
    if "location" in patch and patch["location"] is not None:
        location = str(patch["location"]).strip()[:200]
    if "portfolio_url" in patch and patch["portfolio_url"] is not None:
        portfolio_url = str(patch["portfolio_url"]).strip()[:500]
    if "bio" in patch and patch["bio"] is not None:
        bio = str(patch["bio"]).strip()[:2000]
    if "remote_preference" in patch:
        rp = patch["remote_preference"]
        if rp in (None, "remote", "hybrid", "onsite"):
            remote_preference = rp

    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "user_id": user_id,
        "display_name": display_name,
        "headline": headline,
        "linkedin_url": linkedin_url,
        "phone": phone,
        "location": location,
        "portfolio_url": portfolio_url,
        "bio": bio,
        "remote_preference": remote_preference,
        "updated_at": now,
    }
    res = sb.table("profiles").upsert(payload).select("*").execute()
    if not res.data:
        raise RuntimeError("profile upsert failed")
    return _public_row(res.data[0])
