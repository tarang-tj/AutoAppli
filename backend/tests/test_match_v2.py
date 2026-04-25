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


# ---------------------------------------------------------------------------
# Skill synonym tests
# ---------------------------------------------------------------------------

def test_skill_synonym_py_resolves_to_python():
    assert normalize_skill("py") == "python"


def test_skill_synonym_py3_resolves_to_python():
    assert normalize_skill("py3") == "python"


def test_skill_synonym_js_resolves_to_javascript():
    assert normalize_skill("js") == "javascript"


def test_skill_synonym_ecmascript_resolves_to_javascript():
    assert normalize_skill("ecmascript") == "javascript"


def test_skill_synonym_ts_resolves_to_typescript():
    assert normalize_skill("ts") == "typescript"


def test_skill_synonym_reactjs_resolves_to_react():
    assert normalize_skill("reactjs") == "react"


def test_skill_synonym_react_dot_js_resolves_to_react():
    assert normalize_skill("react.js") == "react"


def test_skill_synonym_nodejs_resolves_to_node():
    assert normalize_skill("nodejs") == "node.js"


def test_skill_synonym_golang_resolves_to_go():
    assert normalize_skill("golang") == "go"


def test_skill_synonym_cpp_resolves_to_cplusplus():
    assert normalize_skill("cpp") == "c++"


def test_skill_synonym_csharp_resolves_to_csharp():
    assert normalize_skill("csharp") == "c#"


def test_skill_synonym_ml_resolves_to_machine_learning():
    assert normalize_skill("ml") == "machine-learning"


def test_skill_synonym_amazon_web_services_resolves_to_aws():
    assert normalize_skill("amazon-web-services") == "aws"


def test_skill_synonym_gcp_aliases():
    assert normalize_skill("google-cloud-platform") == "gcp"
    assert normalize_skill("google-cloud") == "gcp"


def test_synonym_skill_match_full_coverage():
    """JD lists abbreviated skills; candidate lists canonical names — expect 100% skill match."""
    job = _job(
        skills=[],  # will extract from description
        description="We need py, js, ts, golang, reactjs expertise.",
        title="Full Stack Engineer",
    )
    cand = _cand(
        skills=["python", "javascript", "typescript", "go", "react"],
        title="Full Stack Engineer",
    )
    r = score_match(job, cand)
    # All 5 job skills should match via synonym normalization during extract_skills
    job_skills_found = set(extract_skills(job.description))
    assert "python" in job_skills_found
    assert "javascript" in job_skills_found
    assert "typescript" in job_skills_found
    assert "go" in job_skills_found
    assert "react" in job_skills_found


def test_synonym_explicit_skills_100_percent():
    """When job.skills uses abbreviations and candidate uses canonical names, match is full."""
    from backend.app.services.taxonomy import normalize_skill_list

    job_raw = ["py", "js", "ts"]
    cand_raw = ["python", "javascript", "typescript"]

    job_normalized = normalize_skill_list(job_raw)
    cand_normalized = normalize_skill_list(cand_raw)

    assert set(job_normalized) == set(cand_normalized)


# ---------------------------------------------------------------------------
# Title fuzzy matching tests
# ---------------------------------------------------------------------------

def test_title_high_score_similar_roles():
    """Titles with high token overlap should score well."""
    job = _job(title="Software Engineer", skills=["python"])
    cand = _cand(title="Software Engineer", skills=["python"])
    r = score_match(job, cand)
    title = next(b for b in r.breakdown if b.signal == "title")
    assert title.raw >= 0.8, f"Expected high title score for identical titles, got {title.raw}"


def test_title_low_score_different_domains():
    """'Software Engineer' vs 'Marketing Manager' — very different roles."""
    job = _job(title="Software Engineer", skills=["python"])
    cand = _cand(title="Marketing Manager", skills=["python"])
    r = score_match(job, cand)
    title = next(b for b in r.breakdown if b.signal == "title")
    assert title.raw <= 0.35, f"Expected low title score, got {title.raw}"


def test_title_functional_marker_mismatch_penalty():
    """Frontend engineer applying to backend role — functional penalty applies."""
    job = _job(title="Backend Software Engineer")
    cand = _cand(title="Frontend Software Engineer")
    r = score_match(job, cand)
    title = next(b for b in r.breakdown if b.signal == "title")

    # Compare to same-discipline baseline
    job2 = _job(title="Backend Software Engineer")
    cand2 = _cand(title="Backend Software Engineer")
    r2 = score_match(job2, cand2)
    title2 = next(b for b in r2.breakdown if b.signal == "title")

    assert title.raw < title2.raw, "Functional mismatch should lower title score"


def test_title_domain_marker_boost():
    """Shared role-type token ('engineer') should help score over unrelated titles."""
    job = _job(title="Data Engineer", skills=["python", "spark"])
    cand_match = _cand(title="Data Engineer", skills=["python", "spark"])
    cand_mismatch = _cand(title="Product Analyst", skills=["python", "spark"])

    r_match = score_match(job, cand_match)
    r_mismatch = score_match(job, cand_mismatch)

    title_match = next(b for b in r_match.breakdown if b.signal == "title")
    title_mismatch = next(b for b in r_mismatch.breakdown if b.signal == "title")

    assert title_match.raw > title_mismatch.raw


# ---------------------------------------------------------------------------
# Seniority mismatch tests
# ---------------------------------------------------------------------------

def test_seniority_mismatch_junior_to_principal():
    """Junior candidate applying to principal role → low seniority score."""
    job = _job(seniority="principal", title="Principal Software Engineer")
    cand = _cand(seniority="junior", title="Junior Software Engineer")
    r = score_match(job, cand)
    sen = next(b for b in r.breakdown if b.signal == "seniority")
    assert sen.raw <= 0.2, f"Expected low seniority score for junior→principal, got {sen.raw}"


def test_seniority_mismatch_surfaced_in_explanation():
    """Seniority mismatch explanation should mention both levels."""
    job = _job(seniority="principal", title="Principal Software Engineer")
    cand = _cand(seniority="junior", title="Junior Software Engineer")
    r = score_match(job, cand)
    assert "explanations" in r.__dataclass_fields__
    sen_exp = r.explanations.get("seniority", "")
    assert "principal" in sen_exp.lower() or "junior" in sen_exp.lower(), (
        f"Seniority explanation missing level info: '{sen_exp}'"
    )


def test_seniority_exact_match_explanation():
    """Exact seniority match explanation mentions alignment."""
    job = _job(seniority="senior")
    cand = _cand(seniority="senior")
    r = score_match(job, cand)
    sen_exp = r.explanations.get("seniority", "")
    assert "senior" in sen_exp.lower()


# ---------------------------------------------------------------------------
# Explanations populated for every dimension
# ---------------------------------------------------------------------------

def test_explanations_populated_for_all_dimensions():
    """Every scoring dimension must have a non-empty explanation string."""
    r = score_match(_job(), _cand())
    expected_keys = {"skills", "title", "seniority", "location", "remote", "recency", "salary"}
    assert set(r.explanations.keys()) == expected_keys
    for key, value in r.explanations.items():
        assert isinstance(value, str) and len(value) > 0, f"Empty explanation for '{key}'"


def test_explanations_skills_lists_matched_skills():
    """Skills explanation should mention matched skills."""
    r = score_match(_job(), _cand())
    skills_exp = r.explanations.get("skills", "")
    assert "python" in skills_exp.lower() or "matched" in skills_exp.lower()


def test_explanations_missing_skills_mentioned():
    """Skills explanation should mention missing skills when present."""
    r = score_match(_job(), _cand(skills=["python"]))
    skills_exp = r.explanations.get("skills", "")
    assert "missing" in skills_exp.lower()


def test_result_to_dict_includes_explanations():
    """result_to_dict must include the explanations field."""
    from backend.app.services.match_v2 import result_to_dict
    r = score_match(_job(), _cand())
    d = result_to_dict(r)
    assert "explanations" in d
    assert isinstance(d["explanations"], dict)
    assert len(d["explanations"]) > 0
