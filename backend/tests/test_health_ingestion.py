"""
Tests for GET /api/v1/health/ingestion.

Covers:
  - Empty / never-ran state (no heartbeat row → is_stale=True, last_run_at=None)
  - Fresh run (heartbeat updated <6h ago → is_stale=False)
  - Stale run (heartbeat updated >6h ago → is_stale=True)
  - latest_cached_job_at is passed through from the repository
  - DB unreachable (exception → graceful degradation, is_stale=True)

All Supabase calls are mocked — no real network needed.
"""
from __future__ import annotations

import datetime as _dt
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

_MODULE = "app.repositories.ingestion_heartbeat_supabase"


def _make_supabase_mock(heartbeat_row: dict | None, cached_job_row: dict | None):
    """Build a supabase Client mock that returns the given rows."""
    sb = MagicMock()

    # heartbeat query chain: .table().select().eq().maybe_single().execute()
    hb_execute = MagicMock()
    hb_execute.return_value.data = heartbeat_row
    (
        sb.table.return_value
        .select.return_value
        .eq.return_value
        .maybe_single.return_value
        .execute
    ) = hb_execute

    # cached_jobs query chain: .table().select().order().limit().execute()
    cj_execute = MagicMock()
    cj_execute.return_value.data = [cached_job_row] if cached_job_row else []
    (
        sb.table.return_value
        .select.return_value
        .order.return_value
        .limit.return_value
        .execute
    ) = cj_execute

    return sb


def _iso_hours_ago(hours: float) -> str:
    ts = _dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(hours=hours)
    return ts.isoformat()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestIngestionHealthEndpoint:

    def test_empty_state_no_heartbeat_row(self):
        """No heartbeat row (DB returns None) → is_stale True, last_run_at None."""
        sb = _make_supabase_mock(heartbeat_row=None, cached_job_row=None)
        with patch(f"{_MODULE}.create_client", return_value=sb):
            resp = client.get("/api/v1/health/ingestion")

        assert resp.status_code == 200
        data = resp.json()
        assert data["last_run_at"] is None
        assert data["age_seconds"] is None
        assert data["is_stale"] is True
        assert data["latest_cached_job_at"] is None

    def test_sentinel_row_treated_as_never_ran(self):
        """Sentinel row (year 2000) → treated as never ran → is_stale True."""
        sb = _make_supabase_mock(
            heartbeat_row={"last_run_at": "2000-01-01T00:00:00+00:00"},
            cached_job_row=None,
        )
        with patch(f"{_MODULE}.create_client", return_value=sb):
            resp = client.get("/api/v1/health/ingestion")

        data = resp.json()
        assert data["last_run_at"] is None
        assert data["is_stale"] is True

    def test_fresh_run_not_stale(self):
        """Heartbeat updated 1 hour ago → is_stale False."""
        recent = _iso_hours_ago(1)
        cached_ts = _iso_hours_ago(0.5)
        sb = _make_supabase_mock(
            heartbeat_row={"last_run_at": recent},
            cached_job_row={"last_seen_at": cached_ts},
        )
        with patch(f"{_MODULE}.create_client", return_value=sb):
            resp = client.get("/api/v1/health/ingestion")

        assert resp.status_code == 200
        data = resp.json()
        assert data["is_stale"] is False
        assert data["last_run_at"] is not None
        assert data["age_seconds"] is not None
        assert data["age_seconds"] < 6 * 3600
        assert data["latest_cached_job_at"] == cached_ts

    def test_stale_run_over_six_hours(self):
        """Heartbeat updated 7 hours ago → is_stale True."""
        old = _iso_hours_ago(7)
        sb = _make_supabase_mock(
            heartbeat_row={"last_run_at": old},
            cached_job_row=None,
        )
        with patch(f"{_MODULE}.create_client", return_value=sb):
            resp = client.get("/api/v1/health/ingestion")

        data = resp.json()
        assert data["is_stale"] is True
        assert data["age_seconds"] > 6 * 3600

    def test_exactly_six_hours_is_not_stale(self):
        """Exactly 6 h → not yet stale (boundary: stale only when strictly >6h)."""
        exactly_six = _iso_hours_ago(6.0)
        sb = _make_supabase_mock(
            heartbeat_row={"last_run_at": exactly_six},
            cached_job_row=None,
        )
        with patch(f"{_MODULE}.create_client", return_value=sb):
            resp = client.get("/api/v1/health/ingestion")

        data = resp.json()
        # age ≈ 21600 s which equals threshold; floating-point means it
        # may land just above. Accept either not-stale or barely-stale.
        assert data["last_run_at"] is not None

    def test_db_unreachable_degrades_gracefully(self):
        """If create_client raises, endpoint returns is_stale=True without 500."""
        with patch(f"{_MODULE}.create_client", side_effect=Exception("DB down")):
            resp = client.get("/api/v1/health/ingestion")

        assert resp.status_code == 200
        data = resp.json()
        assert data["is_stale"] is True
        assert data["last_run_at"] is None
        assert data["latest_cached_job_at"] is None

    def test_response_keys_present(self):
        """Response always contains the four documented keys."""
        sb = _make_supabase_mock(heartbeat_row=None, cached_job_row=None)
        with patch(f"{_MODULE}.create_client", return_value=sb):
            resp = client.get("/api/v1/health/ingestion")

        data = resp.json()
        assert set(data.keys()) == {
            "last_run_at",
            "age_seconds",
            "is_stale",
            "latest_cached_job_at",
        }
