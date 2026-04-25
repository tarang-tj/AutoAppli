"""
Unit tests for backend/app/services/search_ranking.py

All tests are pure-function / mock-free.  Fixtures create JobSearchResult
instances directly.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

import pytest

from app.models.schemas import JobSearchResult
from app.services.search_ranking import (
    RECENCY_HALF_LIFE_DAYS,
    WEIGHT_COMPLETENESS,
    WEIGHT_LEXICAL,
    WEIGHT_RECENCY,
    WEIGHT_SOURCE_TRUST,
    SOURCE_TRUST_SCORES,
    completeness_score,
    composite_score,
    lexical_score,
    rank_results,
    recency_score,
    source_trust_score,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc)


def _job(
    *,
    title: str = "Software Engineer",
    company: str = "Acme",
    location: str | None = "Boston, MA",
    url: str = "https://example.com/job/1",
    description_snippet: str | None = None,
    posted_date: str | None = None,
    salary: str | None = None,
    source: str = "greenhouse",
) -> JobSearchResult:
    return JobSearchResult(
        title=title,
        company=company,
        location=location,
        url=url,
        description_snippet=description_snippet,
        posted_date=posted_date,
        salary=salary,
        source=source,
    )


# ---------------------------------------------------------------------------
# Module-level invariant
# ---------------------------------------------------------------------------


def test_weights_sum_to_one() -> None:
    total = WEIGHT_LEXICAL + WEIGHT_RECENCY + WEIGHT_COMPLETENESS + WEIGHT_SOURCE_TRUST
    assert abs(total - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# lexical_score
# ---------------------------------------------------------------------------


class TestLexicalScore:
    def test_exact_title_match(self) -> None:
        result = _job(title="Software Engineer Intern", company="MegaCorp")
        score = lexical_score("software engineer intern", result)
        # 3 query tokens × title-weight 3 = 9 raw; max_raw = 6 × 3 = 18 → 0.5.
        # Score is ≥ 0.5 (description would push it higher when present).
        assert score >= 0.5

    def test_no_overlap_returns_zero(self) -> None:
        result = _job(title="Plumber", company="Pipes Inc", description_snippet=None)
        score = lexical_score("software engineer boston", result)
        assert score == 0.0

    def test_empty_query_returns_zero(self) -> None:
        result = _job(title="Software Engineer")
        assert lexical_score("", result) == 0.0

    def test_whitespace_only_query_returns_zero(self) -> None:
        result = _job(title="Software Engineer")
        assert lexical_score("   ", result) == 0.0

    def test_partial_overlap_is_between_zero_and_one(self) -> None:
        result = _job(title="Software Engineer", company="Startup", description_snippet=None)
        score = lexical_score("software architect boston", result)
        assert 0.0 < score < 1.0

    def test_score_bounded_to_one(self) -> None:
        # Every query token appears in every field — should cap at 1.0
        result = _job(
            title="python python python",
            company="python",
            description_snippet="python " * 50,
        )
        score = lexical_score("python", result)
        assert score <= 1.0

    def test_title_weighted_higher_than_company(self) -> None:
        """Token in title should outscore same token only in company."""
        r_title = _job(title="intern", company="BigCo", description_snippet=None)
        r_company = _job(title="engineer", company="intern", description_snippet=None)
        assert lexical_score("intern", r_title) > lexical_score("intern", r_company)

    def test_description_contributes_when_title_misses(self) -> None:
        r_with = _job(
            title="Engineer",
            company="Acme",
            description_snippet="boston internship program 2024",
        )
        r_without = _job(title="Engineer", company="Acme", description_snippet=None)
        assert lexical_score("boston internship", r_with) > lexical_score(
            "boston internship", r_without
        )

    def test_case_insensitive(self) -> None:
        result = _job(title="SOFTWARE ENGINEER")
        assert lexical_score("software engineer", result) == lexical_score(
            "SOFTWARE ENGINEER", result
        )


# ---------------------------------------------------------------------------
# recency_score
# ---------------------------------------------------------------------------


class TestRecencyScore:
    def test_today_scores_near_one(self) -> None:
        result = _job(posted_date=_NOW.strftime("%Y-%m-%d"))
        score = recency_score(result, now=_NOW)
        assert score > 0.95

    def test_one_half_life_ago_scores_half(self) -> None:
        # Use date-only format; the parser treats midnight UTC, so age is
        # RECENCY_HALF_LIFE_DAYS + 0.5 days → score ≈ 0.488.  Widen to 0.02.
        dt = _NOW - timedelta(days=RECENCY_HALF_LIFE_DAYS)
        result = _job(posted_date=dt.strftime("%Y-%m-%d"))
        score = recency_score(result, now=_NOW)
        assert abs(score - 0.5) < 0.02

    def test_old_date_scores_low(self) -> None:
        dt = _NOW - timedelta(days=365)
        result = _job(posted_date=dt.strftime("%Y-%m-%d"))
        score = recency_score(result, now=_NOW)
        assert score < 0.05

    def test_missing_date_returns_neutral(self) -> None:
        result = _job(posted_date=None)
        score = recency_score(result, now=_NOW)
        assert score == 0.5

    def test_future_date_clamps_to_one(self) -> None:
        dt = _NOW + timedelta(days=10)
        result = _job(posted_date=dt.strftime("%Y-%m-%dT%H:%M:%S"))
        score = recency_score(result, now=_NOW)
        assert score == 1.0

    def test_iso_datetime_string_parsed(self) -> None:
        dt = _NOW - timedelta(days=7)
        result = _job(posted_date=dt.isoformat())
        score = recency_score(result, now=_NOW)
        expected = math.pow(2.0, -7.0 / RECENCY_HALF_LIFE_DAYS)
        assert abs(score - expected) < 0.01

    def test_unparseable_date_returns_neutral(self) -> None:
        result = _job(posted_date="not-a-date")
        assert recency_score(result, now=_NOW) == 0.5


# ---------------------------------------------------------------------------
# completeness_score
# ---------------------------------------------------------------------------


class TestCompletenessScore:
    def test_fully_filled_returns_one(self) -> None:
        result = _job(
            salary="$80,000–$100,000",
            location="Boston, MA",
            source="greenhouse",
            description_snippet="x" * 150,
        )
        assert completeness_score(result) == 1.0

    def test_empty_fields_returns_zero(self) -> None:
        result = _job(
            salary=None,
            location=None,
            source="unknown",
            description_snippet=None,
        )
        assert completeness_score(result) == 0.0

    def test_salary_contributes(self) -> None:
        r_with = _job(salary="$80k", location=None, source="unknown", description_snippet=None)
        r_without = _job(salary=None, location=None, source="unknown", description_snippet=None)
        assert completeness_score(r_with) > completeness_score(r_without)

    def test_location_contributes(self) -> None:
        r_with = _job(location="Boston", salary=None, source="unknown", description_snippet=None)
        r_without = _job(location=None, salary=None, source="unknown", description_snippet=None)
        assert completeness_score(r_with) > completeness_score(r_without)

    def test_short_snippet_does_not_get_description_bonus(self) -> None:
        short = _job(description_snippet="Short.", salary=None, location=None, source="unknown")
        none_ = _job(description_snippet=None, salary=None, location=None, source="unknown")
        assert completeness_score(short) == completeness_score(none_)

    def test_long_snippet_gets_description_bonus(self) -> None:
        result = _job(
            description_snippet="x" * 101,
            salary=None,
            location=None,
            source="unknown",
        )
        assert completeness_score(result) > 0.0

    def test_capped_at_one(self) -> None:
        result = _job(
            salary="$120k",
            location="NYC",
            source="lever",
            description_snippet="y" * 200,
        )
        assert completeness_score(result) <= 1.0


# ---------------------------------------------------------------------------
# source_trust_score
# ---------------------------------------------------------------------------


class TestSourceTrustScore:
    @pytest.mark.parametrize("src", ["greenhouse", "lever", "ashby"])
    def test_top_ats_sources_score_highest(self, src: str) -> None:
        result = _job(source=src)
        assert source_trust_score(result) == 1.0

    def test_indeed_scores_lower_than_greenhouse(self) -> None:
        assert source_trust_score(_job(source="indeed")) < source_trust_score(
            _job(source="greenhouse")
        )

    def test_unknown_source_string_returns_default(self) -> None:
        result = _job(source="totally-new-source-xyz")
        score = source_trust_score(result)
        assert 0.0 <= score <= 1.0

    def test_empty_source_treated_as_unknown(self) -> None:
        result = _job(source="unknown")
        score = source_trust_score(result)
        assert score == SOURCE_TRUST_SCORES["unknown"]

    def test_case_insensitive(self) -> None:
        assert source_trust_score(_job(source="Greenhouse")) == source_trust_score(
            _job(source="greenhouse")
        )

    def test_all_defined_sources_in_range(self) -> None:
        for src, val in SOURCE_TRUST_SCORES.items():
            assert 0.0 <= val <= 1.0, f"{src} out of range"


# ---------------------------------------------------------------------------
# composite_score
# ---------------------------------------------------------------------------


class TestCompositeScore:
    def test_returns_float_in_unit_interval(self) -> None:
        result = _job(posted_date=_NOW.strftime("%Y-%m-%d"))
        score = composite_score("software engineer", result, now=_NOW)
        assert 0.0 <= score <= 1.0

    def test_better_match_scores_higher(self) -> None:
        good = _job(
            title="Software Engineer Intern",
            company="Google",
            source="greenhouse",
            posted_date=_NOW.strftime("%Y-%m-%d"),
            salary="$50/hr",
            description_snippet="Python Go distributed systems " * 10,
        )
        bad = _job(
            title="Dishwasher",
            company="Diner",
            source="indeed",
            posted_date=(_NOW - timedelta(days=200)).strftime("%Y-%m-%d"),
            salary=None,
            description_snippet=None,
        )
        assert composite_score("software engineer intern", good, now=_NOW) > composite_score(
            "software engineer intern", bad, now=_NOW
        )

    def test_weights_respected(self) -> None:
        """Manually verify composite = sum of weighted components."""
        result = _job(
            title="Data Scientist",
            company="Lab",
            source="lever",
            posted_date=_NOW.strftime("%Y-%m-%d"),
            salary="$100k",
            description_snippet="machine learning python" * 20,
        )
        query = "data scientist python"
        ls = lexical_score(query, result)
        rs = recency_score(result, now=_NOW)
        cs = completeness_score(result)
        sts = source_trust_score(result)
        expected = (
            WEIGHT_LEXICAL * ls
            + WEIGHT_RECENCY * rs
            + WEIGHT_COMPLETENESS * cs
            + WEIGHT_SOURCE_TRUST * sts
        )
        actual = composite_score(query, result, now=_NOW)
        assert abs(actual - expected) < 1e-9

    def test_deterministic_across_calls(self) -> None:
        result = _job(posted_date=_NOW.strftime("%Y-%m-%d"))
        s1 = composite_score("engineer", result, now=_NOW)
        s2 = composite_score("engineer", result, now=_NOW)
        assert s1 == s2


# ---------------------------------------------------------------------------
# rank_results — full pipeline
# ---------------------------------------------------------------------------


class TestRankResults:
    def test_empty_query_preserves_insertion_order(self) -> None:
        results = [_job(url=f"https://example.com/{i}") for i in range(5)]
        ranked = rank_results("", results)
        assert [r.url for r in ranked] == [r.url for r in results]

    def test_whitespace_only_query_preserves_order(self) -> None:
        results = [_job(url=f"https://example.com/{i}") for i in range(3)]
        assert rank_results("   ", results) == results

    def test_returns_same_count(self) -> None:
        results = [_job(url=f"https://example.com/{i}") for i in range(10)]
        ranked = rank_results("engineer", results)
        assert len(ranked) == 10

    def test_does_not_mutate_input_list(self) -> None:
        results = [_job(url=f"https://example.com/{i}", title=t) for i, t in enumerate(
            ["Zookeeper", "Software Engineer", "Architect"]
        )]
        original_order = [r.url for r in results]
        rank_results("software engineer", results)
        assert [r.url for r in results] == original_order

    def test_high_quality_fresh_match_beats_stale_partial_match(self) -> None:
        """
        Scenario: user searches "swe intern boston".

          winner — exact title match, fresh date, ATS source, full description
          loser  — unrelated title, stale, Indeed source, no extras
        """
        winner = _job(
            title="SWE Intern Boston",
            company="TechCorp",
            source="greenhouse",
            posted_date=(_NOW - timedelta(days=2)).strftime("%Y-%m-%d"),
            salary="$40/hr",
            location="Boston, MA",
            description_snippet=(
                "Software engineering internship in Boston. "
                "Work on backend systems with Python and Go. " * 5
            ),
            url="https://example.com/winner",
        )
        loser = _job(
            title="Delivery Driver",
            company="QuickShip",
            source="indeed",
            posted_date=(_NOW - timedelta(days=300)).strftime("%Y-%m-%d"),
            salary=None,
            location=None,
            description_snippet=None,
            url="https://example.com/loser",
        )

        ranked = rank_results("swe intern boston", [loser, winner], now=_NOW)
        assert ranked[0].url == "https://example.com/winner"
        assert ranked[1].url == "https://example.com/loser"

    def test_fresher_result_wins_over_stale_with_same_title(self) -> None:
        fresh = _job(
            title="Software Engineer",
            source="greenhouse",
            posted_date=(_NOW - timedelta(days=1)).strftime("%Y-%m-%d"),
            url="https://example.com/fresh",
        )
        stale = _job(
            title="Software Engineer",
            source="greenhouse",
            posted_date=(_NOW - timedelta(days=180)).strftime("%Y-%m-%d"),
            url="https://example.com/stale",
        )
        ranked = rank_results("software engineer", [stale, fresh], now=_NOW)
        assert ranked[0].url == "https://example.com/fresh"

    def test_ats_source_beats_indeed_with_equal_title(self) -> None:
        ats = _job(
            title="Backend Engineer",
            source="lever",
            posted_date=_NOW.strftime("%Y-%m-%d"),
            salary="$120k",
            location="San Francisco",
            description_snippet="Python microservices" * 10,
            url="https://example.com/ats",
        )
        scraped = _job(
            title="Backend Engineer",
            source="indeed",
            posted_date=_NOW.strftime("%Y-%m-%d"),
            salary=None,
            location=None,
            description_snippet=None,
            url="https://example.com/scraped",
        )
        ranked = rank_results("backend engineer", [scraped, ats], now=_NOW)
        assert ranked[0].url == "https://example.com/ats"

    def test_single_result_returned_unchanged(self) -> None:
        result = _job(url="https://example.com/only")
        ranked = rank_results("engineer", [result], now=_NOW)
        assert len(ranked) == 1
        assert ranked[0].url == result.url

    def test_empty_results_returns_empty(self) -> None:
        assert rank_results("engineer", []) == []

    def test_ranking_is_descending(self) -> None:
        """Scores must be non-increasing after ranking."""
        results = [
            _job(
                title="Python Backend Engineer",
                source="greenhouse",
                posted_date=(_NOW - timedelta(days=i * 30)).strftime("%Y-%m-%d"),
                url=f"https://example.com/{i}",
            )
            for i in range(6)
        ]
        ranked = rank_results("python backend engineer", results, now=_NOW)
        scores = [composite_score("python backend engineer", r, now=_NOW) for r in ranked]
        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], f"score[{i}]={scores[i]} < score[{i+1}]={scores[i+1]}"
