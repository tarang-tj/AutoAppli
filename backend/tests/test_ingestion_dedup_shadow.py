"""Unit tests for backend.app.services.ingestion.dedup and the orchestrator's
shadow-write wiring.

PR 2 covers:
  • canonical_url — tracking-param stripping, host normalization, idempotency.
  • compute_posting_key — reads pre-normalized fields off NormalizedJob
    (PR 1's company_normalized + location_*) plus normalize_title.
  • raw_hash — stability over re-runs, includes pre-normalized fields.
  • _load_config — both flat and rich config shapes.
  • _shadow_write_enabled — env var truthiness rules.
  • _row_for_cached / _sighting_row — flag-gated posting_key inclusion.

No network I/O. Only modules under test are exercised; no Supabase calls.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from backend.app.services.ingestion.base import NormalizedJob
from backend.app.services.ingestion.dedup import (
    canonical_url,
    compute_posting_key,
    raw_hash,
)


# ---------------------------------------------------------------------------
# Fixture builder
# ---------------------------------------------------------------------------

def _job(**overrides) -> NormalizedJob:
    """Build a NormalizedJob with sensible defaults; overrides as kwargs.

    Defaults to "San Francisco, CA" (US) so __post_init__ populates
    location_city/region/country and company_normalized from PR 1's
    normalizer. Overrides flow through.
    """
    base = dict(
        source="ashby",
        external_id="ext-123",
        title="Senior Software Engineer",
        company="Anthropic",
        url="https://jobs.ashbyhq.com/anthropic/abc",
        description="Build things in Python.",
        location="San Francisco, CA",
        remote_type="hybrid",
        salary_min=None,
        salary_max=None,
        skills=[],
        tags=[],
        posted_at=None,
    )
    base.update(overrides)
    return NormalizedJob(**base)


# ---------------------------------------------------------------------------
# canonical_url
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://example.com/jobs/1", "https://example.com/jobs/1"),
        ("https://www.example.com/jobs/1", "https://example.com/jobs/1"),
        ("HTTPS://EXAMPLE.COM/jobs/1", "https://example.com/jobs/1"),
        ("https://example.com/jobs/1/", "https://example.com/jobs/1"),
        ("https://example.com/jobs/1#footer", "https://example.com/jobs/1"),
        # Tracking params dropped.
        (
            "https://example.com/jobs/1?utm_source=hn&utm_campaign=spring",
            "https://example.com/jobs/1",
        ),
        (
            "https://example.com/jobs/1?gh_src=foo&keep=yes",
            "https://example.com/jobs/1?keep=yes",
        ),
        (
            "https://example.com/jobs/1?gclid=abc&ref=tw",
            "https://example.com/jobs/1",
        ),
        # Bare-host URL keeps its slash.
        ("https://example.com/", "https://example.com/"),
        # Empty / None.
        ("", ""),
        (None, ""),
    ],
)
def test_canonical_url(url, expected):
    assert canonical_url(url) == expected


def test_canonical_url_idempotent():
    """canonical_url(canonical_url(x)) == canonical_url(x) for a wide spread."""
    cases = [
        "https://www.Example.com/jobs/1?utm_source=foo&keep=1",
        "https://EXAMPLE.com/jobs/1/#anchor",
        "https://example.com/jobs/1",
        "",
    ]
    for url in cases:
        once = canonical_url(url)
        twice = canonical_url(once)
        assert once == twice, f"Not idempotent for {url!r}: {once!r} -> {twice!r}"


# ---------------------------------------------------------------------------
# compute_posting_key — consumes PR 1's pre-normalized fields
# ---------------------------------------------------------------------------

def test_posting_key_is_64_hex():
    key = compute_posting_key(_job())
    assert len(key) == 64
    int(key, 16)  # raises if not hex


def test_posting_key_uses_pre_normalized_company():
    """compute_posting_key must read job.company_normalized, not raw company.

    PR 1 normalizes "Anthropic, PBC" to "anthropic" via __post_init__.
    Two jobs with different raw companies but identical company_normalized
    must produce the same key.
    """
    j1 = _job(company="Anthropic")
    j2 = _job(company="Anthropic, Inc.")
    # Sanity-check PR 1 collapsed them.
    assert j1.company_normalized == j2.company_normalized == "anthropic"
    assert compute_posting_key(j1) == compute_posting_key(j2)


def test_posting_key_uses_pre_normalized_location():
    """compute_posting_key must consume location_country/region/city.

    "San Francisco, CA" and "San Francisco, CA, USA" both parse to
    (city=San Francisco, region=CA, country=US) — keys must match.

    Force remote_type="onsite" so location_is_remote stays False; the
    fixture's default "hybrid" would otherwise collapse both keys to
    "remote" and bypass the country/region/city path entirely.
    """
    j1 = _job(location="San Francisco, CA", remote_type="onsite")
    j2 = _job(location="San Francisco, CA, USA", remote_type="onsite")
    assert j1.location_country == j2.location_country == "US"
    assert j1.location_region == j2.location_region == "CA"
    assert j1.location_city == j2.location_city == "San Francisco"
    assert j1.location_is_remote is False
    assert compute_posting_key(j1) == compute_posting_key(j2)


def test_posting_key_collapses_remote_locations():
    """When location_is_remote is True, posting_key uses 'remote' regardless
    of the rest of the location parse."""
    j_remote = _job(location="Remote", remote_type="remote")
    j_anywhere = _job(location="Anywhere", remote_type="remote")
    assert j_remote.location_is_remote
    assert j_anywhere.location_is_remote
    assert compute_posting_key(j_remote) == compute_posting_key(j_anywhere)


def test_posting_key_title_normalized_at_hash_time():
    """compute_posting_key calls normalize_title from PR 1's normalizers.

    "Senior Software Engineer (Remote, US)" and "Sr Software Engineer"
    normalize identically; keys must match.
    """
    j1 = _job(title="Senior Software Engineer (Remote, US)")
    j2 = _job(title="Sr Software Engineer")
    assert compute_posting_key(j1) == compute_posting_key(j2)


def test_posting_key_differs_by_seniority():
    senior = _job(title="Senior Engineer")
    bare = _job(title="Engineer")
    assert compute_posting_key(senior) != compute_posting_key(bare)


def test_posting_key_differs_by_company():
    a = _job(company="Anthropic")
    b = _job(company="OpenAI")
    assert compute_posting_key(a) != compute_posting_key(b)


def test_posting_key_differs_by_location():
    # Use onsite to keep location_is_remote=False for both, otherwise PR 1's
    # should_mark_remote collapses hybrid roles to "remote" regardless of
    # city/country.
    sf = _job(location="San Francisco, CA", remote_type="onsite")
    berlin = _job(location="Berlin, Germany", remote_type="onsite")
    assert sf.location_is_remote is False
    assert berlin.location_is_remote is False
    assert compute_posting_key(sf) != compute_posting_key(berlin)


def test_posting_key_caller_pre_seeded_fields_flow_through():
    """A caller can pre-seed company_normalized and the location tuple;
    PR 1's __post_init__ respects that. The key must reflect the
    pre-seeded values, not re-normalize from raw."""
    job = NormalizedJob(
        source="manual",
        external_id="x",
        title="Engineer",
        company="Whatever, LLC",
        url="https://x",
        company_normalized="my-fixed-co",
        location_city="London",
        location_country="GB",
        location_is_remote=False,
    )
    # Sanity: pre-seeded fields stayed.
    assert job.company_normalized == "my-fixed-co"
    assert job.location_country == "GB"
    # Key reads the pre-seeded values.
    other_job = NormalizedJob(
        source="other",
        external_id="y",
        title="Engineer",
        company="Different Raw, Inc.",
        url="https://y",
        company_normalized="my-fixed-co",
        location_city="London",
        location_country="GB",
        location_is_remote=False,
    )
    assert compute_posting_key(job) == compute_posting_key(other_job)


# ---------------------------------------------------------------------------
# raw_hash
# ---------------------------------------------------------------------------

def test_raw_hash_stable_for_same_payload():
    a = _job()
    b = _job()
    assert raw_hash(a) == raw_hash(b)


def test_raw_hash_changes_when_description_changes():
    a = _job(description="foo")
    b = _job(description="bar")
    assert raw_hash(a) != raw_hash(b)


def test_raw_hash_url_canonicalization():
    """Raw hash uses canonical_url, so tracking-param tail doesn't churn it."""
    a = _job(url="https://example.com/jobs/1")
    b = _job(url="https://example.com/jobs/1?utm_source=hn")
    assert raw_hash(a) == raw_hash(b)


def test_raw_hash_skills_order_invariant():
    a = _job(skills=["python", "fastapi"])
    b = _job(skills=["fastapi", "python"])
    assert raw_hash(a) == raw_hash(b)


def test_raw_hash_includes_normalized_fields():
    """If PR 1 bumps NORMALIZER_VERSION (re-normalizing differently),
    raw_hash should reflect the change so PR 3 detects it."""
    a = _job()
    b = _job()
    # Manually mutate the normalized fields on b; raw_hash must change.
    b.location_city = "Different City"
    assert raw_hash(a) != raw_hash(b)


# ---------------------------------------------------------------------------
# Orchestrator wiring — _load_config / _shadow_write_enabled / row helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def orch():
    from backend.scripts import ingest_all
    return ingest_all


def _write_config(tmp_path: Path, payload: dict) -> Path:
    p = tmp_path / "config.json"
    p.write_text(json.dumps(payload))
    return p


def test_load_config_flat_shape(orch, tmp_path):
    cfg = _write_config(tmp_path, {
        "sources": {
            "greenhouse": ["airbnb", "stripe"],
            "lever": ["mux"],
        }
    })
    out = orch._load_config(cfg)
    assert out["greenhouse"] == {"slugs": ["airbnb", "stripe"], "priority": 999}
    assert out["lever"] == {"slugs": ["mux"], "priority": 999}


def test_load_config_rich_shape(orch, tmp_path):
    cfg = _write_config(tmp_path, {
        "sources": {
            "ashby": {"priority": 1, "slugs": ["linear", "ramp"]},
            "weworkremotely": {"priority": 6, "slugs": ["remote-product-jobs"]},
        }
    })
    out = orch._load_config(cfg)
    assert out["ashby"] == {"slugs": ["linear", "ramp"], "priority": 1}
    assert out["weworkremotely"] == {
        "slugs": ["remote-product-jobs"], "priority": 6,
    }


def test_load_config_mixed_shape(orch, tmp_path):
    cfg = _write_config(tmp_path, {
        "sources": {
            "ashby": {"priority": 1, "slugs": ["linear"]},
            "greenhouse": ["airbnb"],
        }
    })
    out = orch._load_config(cfg)
    assert out["ashby"]["priority"] == 1
    assert out["greenhouse"]["priority"] == 999


def test_load_config_skips_underscore_keys(orch, tmp_path):
    cfg = _write_config(tmp_path, {
        "_comment": ["this is a comment array"],
        "sources": {
            "_meta": ["should be skipped"],
            "ashby": {"priority": 1, "slugs": ["linear"]},
        }
    })
    out = orch._load_config(cfg)
    assert "_meta" not in out
    assert "ashby" in out


def test_load_config_invalid_priority_rejected(orch, tmp_path):
    cfg = _write_config(tmp_path, {
        "sources": {
            "ashby": {"priority": "not-an-int", "slugs": ["linear"]},
        }
    })
    with pytest.raises(SystemExit, match="priority"):
        orch._load_config(cfg)


@pytest.mark.parametrize(
    ("env_value", "expected"),
    [
        ("true", True),
        ("True", True),
        ("1", True),
        ("yes", True),
        ("on", True),
        ("false", False),
        ("0", False),
        ("no", False),
        ("off", False),
        ("", False),
        ("anything-else", False),
    ],
)
def test_shadow_write_enabled(orch, monkeypatch, env_value, expected):
    monkeypatch.setenv("JOBS_DEDUP_V1", env_value)
    assert orch._shadow_write_enabled() is expected


def test_shadow_write_default_off(orch, monkeypatch):
    """Unset env var → off. The flag is a rollback lever, not a default-on."""
    monkeypatch.delenv("JOBS_DEDUP_V1", raising=False)
    assert orch._shadow_write_enabled() is False


def test_row_for_cached_includes_posting_key_when_enabled(orch, monkeypatch):
    monkeypatch.setenv("JOBS_DEDUP_V1", "true")
    row = orch._row_for_cached(_job())
    assert "posting_key" in row
    assert len(row["posting_key"]) == 64
    # PR 1's last_verified_at must still be set.
    assert "last_verified_at" in row


def test_row_for_cached_omits_posting_key_when_disabled(orch, monkeypatch):
    monkeypatch.setenv("JOBS_DEDUP_V1", "false")
    row = orch._row_for_cached(_job())
    assert "posting_key" not in row
    # PR 1 fields still present even with shadow-write off.
    assert "last_verified_at" in row


def test_sighting_row_shape(orch):
    row = orch._sighting_row(
        _job(url="https://example.com/jobs/1?utm_source=hn"),
        "2026-04-24T12:00:00+00:00",
    )
    assert row["source"] == "ashby"
    assert row["external_id"] == "ext-123"
    assert len(row["posting_key"]) == 64
    assert row["url"] == "https://example.com/jobs/1"  # tracking stripped
    assert isinstance(row["raw_hash"], str)
    assert len(row["raw_hash"]) == 40  # sha1 hex
    assert row["last_seen_at"] == "2026-04-24T12:00:00+00:00"
