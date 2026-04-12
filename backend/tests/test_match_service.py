"""Tests for match_service — resume-job fit scoring."""

import pytest
from app.services.match_service import compute_match_score, compute_batch_match_scores


SAMPLE_RESUME = """
JOHN SMITH
San Francisco, CA | john.smith@email.com

PROFESSIONAL SUMMARY
Experienced data analyst with 6+ years building analytics solutions.
Proficient in SQL, Python, Tableau, and modern data tools. Strong background
in product analytics and operational efficiency.

EXPERIENCE
Senior Data Analyst - TechCorp Inc.
- Led data strategy reducing query times by 40% through optimized data warehouse design
- Built automated dashboards using Tableau for executive team
- Implemented data governance framework reducing quality issues by 60%

Data Analyst - StartupXYZ
- Designed ETL pipelines processing 50M+ daily events using Python and SQL
- Conducted A/B testing and statistical analysis for product features
- Created self-service analytics portal

SKILLS
Python, SQL, R, Tableau, Looker, dbt, Airflow, PostgreSQL, Snowflake, BigQuery,
Excel, Git, Statistical Analysis, Google Analytics
"""

GOOD_MATCH_JD = """
Senior Data Analyst — Growth & Product

We are looking for a data analyst to partner with product and marketing.
You will own core dashboards, define metrics, and influence roadmap decisions.

Requirements:
- 4+ years in analytics or data science
- Strong SQL and Python; experience with dbt or similar
- Comfort with A/B testing, statistical analysis, and stakeholder communication
- Experience with Tableau or Looker
- Nice to have: Snowflake, BigQuery, data warehouse design
"""

POOR_MATCH_JD = """
Senior iOS Engineer — Mobile Platform

We need an experienced iOS developer to build our next-generation mobile app.

Requirements:
- 5+ years of Swift and Objective-C
- Deep experience with UIKit and SwiftUI frameworks
- Understanding of Core Data, Core Animation, and Metal
- Experience with Xcode instruments for performance profiling
- Knowledge of CI/CD pipelines for iOS (Fastlane, TestFlight)
"""


class TestComputeMatchScore:
    def test_good_match_high_score(self):
        result = compute_match_score(SAMPLE_RESUME, GOOD_MATCH_JD)
        assert result["score"] >= 50, f"Expected >= 50 for good match, got {result['score']}"

    def test_poor_match_low_score(self):
        result = compute_match_score(SAMPLE_RESUME, POOR_MATCH_JD)
        assert result["score"] < 40, f"Expected < 40 for poor match, got {result['score']}"

    def test_good_match_beats_poor(self):
        good = compute_match_score(SAMPLE_RESUME, GOOD_MATCH_JD)
        poor = compute_match_score(SAMPLE_RESUME, POOR_MATCH_JD)
        assert good["score"] > poor["score"], (
            f"Good match ({good['score']}) should beat poor ({poor['score']})"
        )

    def test_matched_keywords_present(self):
        result = compute_match_score(SAMPLE_RESUME, GOOD_MATCH_JD)
        assert len(result["matched_keywords"]) > 0
        # SQL and Python should definitely match
        matched_lower = [k.lower() for k in result["matched_keywords"]]
        assert "sql" in matched_lower or "python" in matched_lower

    def test_missing_keywords_for_poor_match(self):
        result = compute_match_score(SAMPLE_RESUME, POOR_MATCH_JD)
        assert len(result["missing_keywords"]) > 0
        missing_lower = [k.lower() for k in result["missing_keywords"]]
        assert "swift" in missing_lower or "ios" in missing_lower or "swiftui" in missing_lower

    def test_empty_resume(self):
        result = compute_match_score("", GOOD_MATCH_JD)
        assert result["score"] == 0
        assert result["matched_keywords"] == []

    def test_empty_jd(self):
        result = compute_match_score(SAMPLE_RESUME, "")
        assert result["score"] == 0

    def test_both_empty(self):
        result = compute_match_score("", "")
        assert result["score"] == 0

    def test_perfect_overlap(self):
        text = "python sql tableau data analytics pipeline warehouse dbt"
        result = compute_match_score(text, text)
        assert result["score"] >= 80


class TestBatchMatchScores:
    def test_batch_returns_all_jobs(self):
        jobs = [
            {"id": "j1", "description": GOOD_MATCH_JD},
            {"id": "j2", "description": POOR_MATCH_JD},
            {"id": "j3", "description": ""},
        ]
        results = compute_batch_match_scores(SAMPLE_RESUME, jobs)
        assert set(results.keys()) == {"j1", "j2", "j3"}
        assert results["j1"]["score"] > results["j2"]["score"]
        assert results["j3"]["score"] == 0

    def test_empty_jobs_list(self):
        results = compute_batch_match_scores(SAMPLE_RESUME, [])
        assert results == {}
