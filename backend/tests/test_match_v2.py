"""Tests for backend.app.services.match_v2.

Run with: `pytest backend/tests/test_match_v2.py -v`
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from backend.app.services.match_v2 import (
    DEFAULT_WEIGHTS,
    CandidateProfile,
    JobProfile,
    detect_remote_type,
    extract_skills,
    rank_jobs,
    score_match,
)
from backend.app.services.taxonomy import normalize_skill


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _job(**overrides) -> JobProfile:
    defaults = dict(
        title="Senior Software Engineer",
        description="Build services in Python with FastAPI and PostgreSQL. AWS experience required.",
        location="San Francisco, CA",
        skills=["python", "fastapi", "postgresql", "aws"],
        seniority="senior",
        remote_type="hybrid",
        salary_min=150000,
        salary_max=200000,
        posted_at=_now_iso(),
    )
    defaults.update(overrides)
    return JobProfile(**defaults)


def _cand(**overrides) -> CandidateProfile:
    defaults = dict(
        skills=["python", "fastapi", "postgresql", "aws", "docker"],
        title="Senior Backend Engineer",
        seniority="senior",
        years_of_experience=6,
        location="San Francisco, CA",
        remote_preference="hybrid",
        salary_target=180000,
        resume_text="",
    )
    defaults.update(overrides)
    return CandidateProfile(**defaults)


def test_default_weights_sum_to_one():
    assert abs(sum(DEFAULT_WEIGHTS.values()) - 1.0) < 1e-6


def test_strong_candidate_scores_high():
    r = score_match(_job(), _cand())
    assert r.score >= 70
    assert len(r.matched_skills) == 4
    assert r.missing_skills == []


def test_weak_candidate_scores_low():
    r = score_match(_job(), _cand(
        skills=["php", "mysql"],
        title="Junior PHP Developer",
        seniority="junior",
        salary_target=300000,
        location="Berlin, Germany",
        remote_preference="onsite",
    ))
    assert r.score < 55
    assert set(r.missing_skills) == {"python", "fastapi", "postgresql", "aws"}


def test_breakdown_points_equal_raw_times_weight_times_100():
    r = score_match(_job(), _cand())
    for row in r.breakdown:
        assert row.points == pytest.approx(row.raw * row.weight * 100, rel=1e-6)


def test_remote_exact_match():
    r = score_match(_job(remote_type="remote"), _cand(remote_preference="remote"))
    remote = next(b for b in r.breakdown if b.signal == "remote")
    assert remote.raw == 1.0


def test_remote_onsite_vs_remote_penalized():
    r = score_match(_job(remote_type="onsite"), _cand(remote_preference="remote"))
    remote = next(b for b in r.breakdown if b.signal == "remote")
    assert remote.raw <= 0.2


def test_hybrid_remote_partial():
    r = score_match(_job(remote_type="remote"), _cand(remote_preference="hybrid"))
    remote = next(b for b in r.breakdown if b.signal == "remote")
    assert remote.raw == pytest.approx(0.7, abs=0.01)


def test_salary_target_above_range_is_excellent():
    r = score_match(_job(), _cand(salary_target=140000))
    sal = next(b for b in r.breakdown if b.signal == "salary")
    assert sal.raw == 1.0


def test_salary_target_far_above_ceiling_low():
    r = score_match(_job(), _cand(salary_target=400000))
    sal = next(b for b in r.breakdown if b.signal == "salary")
    assert sal.raw <= 0.3


def test_recency_fresh_is_one():
    r = score_match(_job(posted_at=_now_iso()), _cand())
    rec = next(b for b in r.breakdown if b.signal == "recency")
    assert rec.raw == 1.0


def test_recency_stale_penalized():
    stale = (datetime.now(timezone.utc) - timedelta(days=120)).isoformat()
    r = score_match(_job(posted_at=stale), _cand())
    rec = next(b for b in r.breakdown if b.signal == "recency")
    assert rec.raw <= 0.2


def test_rank_jobs_orders_best_first():
    jobs = [
        _job(id="a", title="Senior Software Engineer"),
        _job(id="b", title="Junior PHP Developer", skills=["php", "mysql"], seniority="junior"),
        _job(id="c", title="Senior ML Engineer", skills=["python", "tensorflow", "aws"]),
    ]
    ranked = rank_jobs(jobs, _cand())
    assert ranked[0][0].id == "a"
    assert ranked[-1][0].id == "b"


def test_extract_skills_canonical():
    s = extract_skills("We use React, Next.js, and TypeScript. Backend is FastAPI + Postgres.")
    assert "react" in s
    assert "next.js" in s
    assert "typescript" in s
    assert "fastapi" in s
    assert "postgresql" in s


def test_normalize_skill_aliases():
    assert normalize_skill("JS") == "javascript"
    assert normalize_skill("K8S") == "kubernetes"
    assert normalize_skill("react.js") == "react"
    assert normalize_skill("foobarbaz") is None


def test_detect_remote_type():
    assert detect_remote_type("Hybrid role with remote flexibility") == "hybrid"
    assert detect_remote_type("100% remote team") == "remote"
    assert detect_remote_type("on-site role in NYC") == "onsite"


def test_score_match_invalid_weights_raises():
    with pytest.raises(ValueError):
        score_match(_job(), _cand(), weights={"skills": 0.5, "title": 0.5, "seniority": 0.5, "location": 0, "remote": 0, "recency": 0, "salary": 0})
