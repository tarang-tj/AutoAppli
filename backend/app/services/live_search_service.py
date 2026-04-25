"""
Multi-source live search — Phase A1 of the level-up.

Strategy:
    1. Query `cached_jobs` first. The nightly ingestion cron
       (greenhouse, lever, ashby, workable, smartrecruiters,
       weworkremotely) already populates this table — typically
       10k-100k active rows. Most user searches find plenty of hits
       here with zero network cost and zero latency.

    2. Fall back to the live Indeed scraper when cached results are
       thin (< threshold). This handles long-tail / niche queries that
       the ATS-first ingestion misses.

    3. Deduplicate by canonical URL.

    4. Map everything into `JobSearchResult` so the router / frontend
       see a single uniform shape regardless of source.

This intentionally sits alongside `scraper_service.py` rather than
replacing it — the scraper is still the only thing that knows how to
do an on-demand Indeed fetch, and we want to keep it around as a
fallback and for structured-data extraction (`scrape_job_details`).
"""
from __future__ import annotations

import logging
from typing import Optional

from app.config import Settings
from app.deps.jobs_auth import jobs_use_supabase
from app.models.schemas import JobSearchResult
from app.repositories import cached_jobs_supabase
from app.services import scraper_service
from app.services.search_ranking import rank_results

logger = logging.getLogger(__name__)


_CACHED_FALLBACK_THRESHOLD = 5  # if cached returns < N, also hit the live scraper


def _cached_to_result(row: dict) -> JobSearchResult:
    """Map a `cached_jobs` row into the API response shape."""
    desc = row.get("description") or ""
    snippet = desc[:280] + "…" if len(desc) > 280 else desc or None
    posted_at = row.get("posted_at") or row.get("last_seen_at")
    salary_min = row.get("salary_min")
    salary_max = row.get("salary_max")
    salary_display: Optional[str] = None
    if salary_min and salary_max:
        salary_display = f"${salary_min:,}–${salary_max:,}"
    elif salary_min:
        salary_display = f"from ${salary_min:,}"
    elif salary_max:
        salary_display = f"up to ${salary_max:,}"

    return JobSearchResult(
        title=str(row.get("title") or ""),
        company=str(row.get("company") or ""),
        location=row.get("location"),
        url=str(row.get("url") or ""),
        description_snippet=snippet,
        posted_date=str(posted_at) if posted_at else None,
        salary=salary_display,
        source=str(row.get("source") or "cached"),
    )


async def live_search(
    settings: Settings,
    query: str,
    location: Optional[str] = None,
    remote_only: bool = False,
    page: int = 1,
    per_page: int = 20,
) -> list[JobSearchResult]:
    """Search jobs from cached firehose first, topped up with live scrape."""
    results: list[JobSearchResult] = []
    seen_urls: set[str] = set()

    if jobs_use_supabase(settings):
        try:
            cached_limit = per_page * page + 20
            cached_rows = cached_jobs_supabase.search_cached_jobs(
                settings,
                query=query,
                location=location or None,
                remote_only=remote_only,
                limit=cached_limit,
            )
        except Exception as e:
            logger.warning("cached_jobs search failed: %s", e)
            cached_rows = []

        for row in cached_rows:
            url = str(row.get("url") or "")
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            results.append(_cached_to_result(row))

    # Top off with a live Indeed scrape when cached coverage is thin.
    if len(results) < _CACHED_FALLBACK_THRESHOLD:
        try:
            live = await scraper_service.search_jobs(
                query=query,
                location=location,
                remote_only=remote_only,
                page=page,
                per_page=per_page,
            )
        except Exception as e:
            logger.warning("live scraper failed: %s", e)
            live = []

        for r in live:
            if r.url not in seen_urls:
                seen_urls.add(r.url)
                results.append(r)

    # Rank by relevance (skipped when query is empty — preserve insertion order).
    ranked = rank_results(query, results)

    # Page slice.
    start = (page - 1) * per_page
    return ranked[start : start + per_page]
