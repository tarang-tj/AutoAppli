"""Tests for live_search_service — the cached-first search orchestration.

The service has two network-ish dependencies (Supabase + the live Indeed
scraper) that we never want to hit in unit tests. We monkey-patch both.
"""
from __future__ import annotations

from unittest.mock import patch, AsyncMock

import pytest

from app.models.schemas import JobSearchResult
from app.services import live_search_service


class _FakeSettings:
    SUPABASE_URL = "https://fake.supabase.co"
    SUPABASE_KEY = "fake-key"
    SUPABASE_JWT_SECRET = "fake"
    CLAUDE_MODEL = "claude-sonnet-4-20250514"
    ANTHROPIC_API_KEY = ""


def _fake_cached_row(i: int, *, source: str = "greenhouse") -> dict:
    return {
        "id": f"cj-{i}",
        "source": source,
        "external_id": str(i),
        "title": f"Senior Backend Engineer #{i}",
        "company": f"Acme-{i}",
        "url": f"https://example.test/jobs/{i}",
        "description": "Python, FastAPI, PostgreSQL, AWS. Remote-friendly.",
        "location": "Remote (US)",
        "remote_type": "remote",
        "posted_at": "2026-04-22T12:00:00Z",
        "last_seen_at": "2026-04-22T12:00:00Z",
    }


@pytest.mark.asyncio
async def test_cached_first_skips_live_scrape_when_coverage_is_good():
    rows = [_fake_cached_row(i) for i in range(12)]
    with patch.object(
        live_search_service.cached_jobs_supabase,
        "search_cached_jobs",
        return_value=rows,
    ), patch.object(
        live_search_service.scraper_service,
        "search_jobs",
        new=AsyncMock(return_value=[]),
    ) as scraper:
        out = await live_search_service.live_search(
            _FakeSettings(),
            query="backend engineer",
            per_page=10,
        )
    assert len(out) == 10
    assert all(isinstance(r, JobSearchResult) for r in out)
    # Indeed scraper must NOT have been called when we had enough cached hits.
    scraper.assert_not_awaited()


@pytest.mark.asyncio
async def test_falls_back_to_live_scrape_when_cached_is_thin():
    sparse = [_fake_cached_row(i) for i in range(2)]
    scraped = [
        JobSearchResult(
            title="Live scrape result",
            company="LiveCo",
            url="https://indeed.com/viewjob?jk=abc123",
            description_snippet="...",
            source="indeed",
        )
    ]
    with patch.object(
        live_search_service.cached_jobs_supabase,
        "search_cached_jobs",
        return_value=sparse,
    ), patch.object(
        live_search_service.scraper_service,
        "search_jobs",
        new=AsyncMock(return_value=scraped),
    ) as scraper:
        out = await live_search_service.live_search(
            _FakeSettings(),
            query="very niche role",
            per_page=10,
        )
    assert any(r.source == "indeed" for r in out), "fallback scraper should contribute"
    scraper.assert_awaited_once()


@pytest.mark.asyncio
async def test_deduplicates_across_sources_by_url():
    dup_url = "https://example.test/jobs/99"
    cached = [{**_fake_cached_row(99), "url": dup_url}]
    scraped = [
        JobSearchResult(
            title="Dup from Indeed",
            company="Dup",
            url=dup_url,
            source="indeed",
        )
    ]
    with patch.object(
        live_search_service.cached_jobs_supabase,
        "search_cached_jobs",
        return_value=cached,
    ), patch.object(
        live_search_service.scraper_service,
        "search_jobs",
        new=AsyncMock(return_value=scraped),
    ):
        out = await live_search_service.live_search(
            _FakeSettings(),
            query="x",
            per_page=10,
        )
    urls = [r.url for r in out]
    assert urls.count(dup_url) == 1, "URL must appear once after dedup"
