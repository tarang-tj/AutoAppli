"""Tests for the iCal deadline export.

Covers two layers:
1. ``app.services.ical_service.build_deadlines_ical`` — pure RFC 5545
   serialization (escaping, line folding, CRLF endings, ordering, the
   empty-input case).
2. ``GET /api/v1/export/deadlines.ics`` — router-level smoke test that
   verifies the Content-Type, Content-Disposition, and that the body
   parses as a valid VCALENDAR.

The service tests don't require the full FastAPI app — they call the
pure builder with hand-rolled dicts.
"""
from __future__ import annotations

import os
import re
import sys
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.deps.jobs_auth import get_jobs_user_id
from app.repositories import jobs_memory
from app.routers import export as export_router
from app.services.ical_service import (
    DEFAULT_CALENDAR_NAME,
    _escape_text,
    _fold_line,
    build_deadlines_ical,
)


# ── Helpers ──────────────────────────────────────────────────────────────────


FIXED_NOW = datetime(2026, 4, 25, 9, 30, 0, tzinfo=timezone.utc)


def _job(
    *,
    id: str = "job-1",
    company: str = "Acme",
    title: str = "Backend Engineer",
    url: str = "https://acme.example/jobs/1",
    description: str | None = "Build APIs.",
    closing_date: str | date | None = "2026-05-15",
    **extra,
) -> dict:
    """Build a minimal job dict matching the shape the repository returns."""
    base = {
        "id": id,
        "company": company,
        "title": title,
        "url": url,
        "description": description,
        "closing_date": closing_date,
    }
    base.update(extra)
    return base


# ── Service: empty input ─────────────────────────────────────────────────────


def test_empty_jobs_returns_valid_empty_calendar():
    """No jobs → still a valid VCALENDAR shell, no VEVENTs."""
    out = build_deadlines_ical([], now=FIXED_NOW)

    assert out.startswith("BEGIN:VCALENDAR\r\n")
    assert out.rstrip("\r\n").endswith("END:VCALENDAR")
    assert "BEGIN:VEVENT" not in out
    # Required headers present
    for required in (
        "VERSION:2.0",
        "PRODID:-//AutoAppli//Deadline Export//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-TIMEZONE:UTC",
    ):
        assert required in out


def test_calendar_name_appears_in_headers():
    out = build_deadlines_ical([], now=FIXED_NOW)
    # The default name contains an em-dash; both NAME and X-WR-CALNAME
    # use the same escaped value.
    expected = _escape_text(DEFAULT_CALENDAR_NAME)
    assert f"NAME:{expected}" in out
    assert f"X-WR-CALNAME:{expected}" in out


# ── Service: single event ────────────────────────────────────────────────────


def test_single_job_renders_one_vevent_with_summary_and_uid():
    out = build_deadlines_ical([_job(id="abc123")], now=FIXED_NOW)
    assert out.count("BEGIN:VEVENT") == 1
    assert out.count("END:VEVENT") == 1
    assert "UID:abc123@autoappli.app" in out
    assert "SUMMARY:Apply: Acme — Backend Engineer" in out
    assert "DTSTART;VALUE=DATE:20260515" in out
    # All-day events are exclusive on DTEND — next day.
    assert "DTEND;VALUE=DATE:20260516" in out
    assert "STATUS:CONFIRMED" in out
    assert "TRANSP:TRANSPARENT" in out


def test_dtstamp_uses_provided_now():
    out = build_deadlines_ical([_job()], now=FIXED_NOW)
    assert "DTSTAMP:20260425T093000Z" in out


# ── Service: skipping & past dates ───────────────────────────────────────────


def test_job_without_closing_date_is_skipped():
    jobs = [_job(id="has-date"), _job(id="no-date", closing_date=None)]
    out = build_deadlines_ical(jobs, now=FIXED_NOW)
    assert out.count("BEGIN:VEVENT") == 1
    assert "UID:has-date@autoappli.app" in out
    assert "UID:no-date@autoappli.app" not in out


def test_past_deadline_still_included():
    out = build_deadlines_ical(
        [_job(id="past", closing_date="2020-01-15")], now=FIXED_NOW
    )
    assert "BEGIN:VEVENT" in out
    assert "DTSTART;VALUE=DATE:20200115" in out


def test_legacy_deadline_field_is_supported():
    """Schema column is ``deadline`` while spec called it ``closing_date``."""
    jobs = [_job(id="legacy", closing_date=None, deadline="2026-06-01")]
    out = build_deadlines_ical(jobs, now=FIXED_NOW)
    assert "DTSTART;VALUE=DATE:20260601" in out


# ── Service: escaping ────────────────────────────────────────────────────────


def test_special_characters_escaped_in_summary():
    job = _job(
        id="esc-1",
        company="A; B, Co.",
        title="Eng \\ Backend",
        description=None,
    )
    out = build_deadlines_ical([job], now=FIXED_NOW)
    # ; , \ all escaped per RFC 5545 §3.3.11.
    assert "SUMMARY:Apply: A\\; B\\, Co. — Eng \\\\ Backend" in out


def test_newlines_in_description_become_literal_backslash_n():
    job = _job(
        id="nl-1",
        url="",  # so the URL block doesn't add its own newlines
        description="line one\nline two",
    )
    out = build_deadlines_ical([job], now=FIXED_NOW)
    # No raw newline inside the DESCRIPTION value — only \n literal.
    # Fish out the DESCRIPTION line(s) and confirm the literal escape.
    desc_match = re.search(r"DESCRIPTION:[^\r\n]+", out)
    assert desc_match is not None
    assert "\\n" in desc_match.group(0)


# ── Service: line folding ────────────────────────────────────────────────────


def test_fold_line_splits_long_ascii():
    line = "X-LONG:" + ("a" * 200)
    folded = _fold_line(line, octet_limit=75)
    parts = folded.split("\r\n")
    assert len(parts) > 1
    # First part ≤75 octets; continuation parts start with a single space
    # and are ≤75 octets total (incl. the space).
    assert len(parts[0].encode("utf-8")) <= 75
    for p in parts[1:]:
        assert p.startswith(" ")
        assert len(p.encode("utf-8")) <= 75


def test_long_description_is_folded():
    long_desc = "x" * 800
    out = build_deadlines_ical(
        [_job(id="long", description=long_desc, url="")], now=FIXED_NOW
    )
    # Every physical line in the output must be ≤75 octets.
    for raw_line in out.split("\r\n"):
        assert len(raw_line.encode("utf-8")) <= 75, raw_line


def test_crlf_line_endings_everywhere():
    out = build_deadlines_ical([_job()], now=FIXED_NOW)
    # No bare LFs (every \n must be preceded by \r). Walk byte-by-byte.
    for i, ch in enumerate(out):
        if ch == "\n":
            assert i > 0 and out[i - 1] == "\r", f"bare LF at index {i}"


# ── Service: ordering ────────────────────────────────────────────────────────


def test_multiple_jobs_sorted_by_closing_date_ascending():
    jobs = [
        _job(id="c", closing_date="2026-08-01", company="C"),
        _job(id="a", closing_date="2026-05-01", company="A"),
        _job(id="b", closing_date="2026-06-15", company="B"),
    ]
    out = build_deadlines_ical(jobs, now=FIXED_NOW)
    # Find the UID lines in document order — they must come out a, b, c.
    uids = re.findall(r"UID:([^\r\n@]+)@autoappli\.app", out)
    assert uids == ["a", "b", "c"]


# ── Router smoke test ────────────────────────────────────────────────────────


@pytest.fixture
def app() -> FastAPI:
    a = FastAPI()
    a.include_router(export_router.router, prefix="/api/v1")
    return a


@pytest.fixture(autouse=True)
def _reset_jobs_memory():
    jobs_memory._jobs.clear()
    yield
    jobs_memory._jobs.clear()


@pytest.fixture
def authed_client(app: FastAPI) -> TestClient:
    fake_user = "user-ical-test"

    def _fake_user_id() -> str:
        return fake_user

    app.dependency_overrides[get_jobs_user_id] = _fake_user_id
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_endpoint_returns_text_calendar_with_attachment_disposition(
    authed_client: TestClient,
):
    # Seed a job and pin a deadline on it — jobs_memory.create_job
    # doesn't accept deadline, but the dict supports arbitrary keys.
    j = jobs_memory.create_job(
        "Acme",
        "Engineer",
        "https://acme.example/jobs/9",
        "Build cool things.",
        "manual",
    )
    j["deadline"] = "2026-07-04"

    r = authed_client.get("/api/v1/export/deadlines.ics")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/calendar")
    assert "attachment" in r.headers.get("content-disposition", "")
    assert "autoappli-deadlines.ics" in r.headers["content-disposition"]

    body = r.text
    # Sanity-check the body parses as iCal — regex, not a real parser.
    assert re.match(r"^BEGIN:VCALENDAR\r\n", body)
    assert "BEGIN:VEVENT\r\n" in body
    assert "DTSTART;VALUE=DATE:20260704" in body
    assert "SUMMARY:Apply: Acme — Engineer" in body
    assert body.rstrip("\r\n").endswith("END:VCALENDAR")


def test_endpoint_empty_board_returns_empty_calendar(authed_client: TestClient):
    r = authed_client.get("/api/v1/export/deadlines.ics")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/calendar")
    body = r.text
    assert "BEGIN:VCALENDAR" in body
    assert "END:VCALENDAR" in body
    assert "BEGIN:VEVENT" not in body
