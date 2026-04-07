from __future__ import annotations

import logging
from datetime import datetime, timezone

from supabase import Client, create_client

from app.config import Settings
from app.models.schemas import JobSearchResult, SearchRequest
from app.utils.job_url import normalize_job_url

logger = logging.getLogger(__name__)


def _client(settings: Settings) -> Client:
    return create_client(settings.SUPABASE_URL.strip(), settings.SUPABASE_KEY.strip())


def _listing_payload(r: JobSearchResult) -> dict:
    url = normalize_job_url(r.url) or (r.url or "").strip()
    snippet = (r.description_snippet or "")[:8000]
    return {
        "url": url,
        "title": r.title[:2000] if r.title else "",
        "company": r.company[:500] if r.company else "",
        "location": (r.location or "")[:500],
        "snippet": snippet,
        "posted_date": (r.posted_date or "")[:200] or None,
        "salary": (r.salary or "")[:500] or None,
        "source": (r.source or "unknown")[:100],
        "last_seen_at": datetime.now(timezone.utc).isoformat(),
    }


def persist_search_run(
    settings: Settings,
    user_id: str,
    req: SearchRequest,
    results: list[JobSearchResult],
) -> str | None:
    """Upsert listings, record search run + ordered result links. Returns search row id."""
    sb = _client(settings)
    listing_ids: list[str] = []
    for r in results:
        try:
            row = _listing_payload(r)
            if not row["url"]:
                continue
            res = (
                sb.table("job_listings")
                .upsert(row, on_conflict="url")
                .select("id")
                .execute()
            )
            if res.data:
                listing_ids.append(str(res.data[0]["id"]))
        except Exception as exc:
            logger.debug("listing upsert skip: %s", exc)
            continue

    try:
        run = (
            sb.table("job_searches")
            .insert(
                {
                    "user_id": user_id,
                    "query": req.query.strip(),
                    "location": (req.location or "").strip(),
                    "remote_only": req.remote_only,
                    "page": req.page,
                    "per_page": req.per_page,
                    "result_count": len(listing_ids),
                }
            )
            .select("id")
            .execute()
        )
        if not run.data:
            return None
        search_id = str(run.data[0]["id"])

        if listing_ids:
            items = [
                {"search_id": search_id, "listing_id": lid, "sort_order": i}
                for i, lid in enumerate(listing_ids)
            ]
            sb.table("job_search_result_items").insert(items).execute()
        return search_id
    except Exception as exc:
        logger.warning("persist_search_run failed: %s", exc)
        return None


def list_search_history(settings: Settings, user_id: str, limit: int) -> list[dict]:
    sb = _client(settings)
    res = (
        sb.table("job_searches")
        .select("id, query, location, remote_only, result_count, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows = res.data or []
    return [
        {
            "id": str(r["id"]),
            "query": r["query"],
            "location": r.get("location") or "",
            "remote_only": bool(r.get("remote_only", False)),
            "result_count": int(r.get("result_count", 0)),
            "created_at": r["created_at"],
        }
        for r in rows
    ]
