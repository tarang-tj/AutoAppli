"""Tests for the resume eval pipeline."""

import sys
import os

# Add the backend app to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.eval_service import (
    evaluate_tailored_resume,
    score_keyword_coverage,
    detect_hallucinations,
    measure_change_delta,
    _extract_keywords,
    _extract_skills,
)

# ── Sample data ─────────────────────────────────────────────────────────────

ORIGINAL_RESUME = """
Tarang Jammalamadaka
tarang@example.com | linkedin.com/in/tarang | 555-0123

EXPERIENCE

Software Engineer, Acme Corp — 2022-Present
- Built REST APIs using Python and FastAPI serving 10K+ daily requests
- Designed PostgreSQL schemas and optimized slow queries reducing p95 latency by 40%
- Implemented CI/CD pipelines using GitHub Actions and Docker
- Collaborated with product team on feature specs and technical design docs

Frontend Developer Intern, StartupXYZ — Summer 2021
- Developed React components with TypeScript for a customer dashboard
- Integrated Stripe payment APIs and handled webhook processing
- Wrote unit tests with Jest achieving 85% code coverage

EDUCATION
B.S. Computer Science, University of Example — 2022

SKILLS
Python, TypeScript, React, FastAPI, PostgreSQL, Docker, Git, AWS (S3, Lambda), REST APIs
"""

JOB_DESCRIPTION = """
Senior Full-Stack Engineer — FinTech Startup

We're looking for a Senior Full-Stack Engineer to build and scale our payments platform.

Requirements:
- 3+ years of experience with Python and TypeScript
- Strong experience with React and modern frontend frameworks
- Database design experience (PostgreSQL preferred)
- Experience with payment processing (Stripe, Plaid, or similar)
- Familiarity with Docker, Kubernetes, and CI/CD pipelines
- Experience with AWS services (S3, Lambda, ECS, RDS)
- Strong understanding of REST APIs and microservices architecture
- Excellent problem-solving and communication skills

Nice to have:
- Experience with GraphQL
- Knowledge of financial regulations (SOX, PCI-DSS)
- Experience with event-driven architectures (Kafka, RabbitMQ)
- Contributions to open-source projects
"""

# A good tailored resume: keeps real skills, emphasizes relevant experience
GOOD_TAILORED = """
Tarang Jammalamadaka
tarang@example.com | linkedin.com/in/tarang | 555-0123

SUMMARY
Full-stack engineer with experience building payment processing systems and scalable APIs.
Proficient in Python, TypeScript, React, and PostgreSQL with hands-on AWS deployment experience.

EXPERIENCE

Software Engineer, Acme Corp — 2022-Present
- Architected and maintained RESTful microservices using Python and FastAPI, serving 10K+ daily requests across a distributed payments platform
- Designed and optimized PostgreSQL database schemas, reducing p95 query latency by 40% for high-throughput transaction processing
- Built and maintained CI/CD pipelines using GitHub Actions and Docker, enabling rapid deployment cycles
- Collaborated cross-functionally with product and engineering teams on technical design and feature specifications

Frontend Developer Intern, StartupXYZ — Summer 2021
- Developed production React components with TypeScript for a customer-facing payments dashboard
- Integrated Stripe payment APIs and implemented robust webhook processing for real-time transaction updates
- Authored comprehensive unit tests with Jest achieving 85% code coverage across payment flows

EDUCATION
B.S. Computer Science, University of Example — 2022

SKILLS
Python, TypeScript, React, FastAPI, PostgreSQL, Docker, Git, AWS (S3, Lambda, ECS), REST APIs, Stripe, CI/CD, Microservices
"""

# A bad tailored resume: hallucinated skills
BAD_TAILORED = """
Tarang Jammalamadaka
tarang@example.com | linkedin.com/in/tarang | 555-0123

SUMMARY
Senior full-stack engineer with 5+ years building fintech platforms.
Expert in Python, TypeScript, React, Kubernetes, Kafka, and GraphQL.

EXPERIENCE

Senior Software Engineer, Acme Corp — 2020-Present
- Led a team of 8 engineers building a Kubernetes-based microservices platform
- Designed event-driven architecture using Kafka processing 1M+ events/day
- Built GraphQL APIs and implemented PCI-DSS compliant payment flows
- Managed AWS infrastructure including ECS, RDS, and CloudFormation

Frontend Developer, StartupXYZ — 2019-2020
- Developed React components with TypeScript for a customer dashboard
- Integrated Stripe and Plaid payment APIs
- Implemented comprehensive testing with 95% code coverage

EDUCATION
B.S. Computer Science, University of Example — 2022
AWS Certified Solutions Architect

SKILLS
Python, TypeScript, React, GraphQL, Kafka, Kubernetes, PostgreSQL, Docker, Git, AWS, Terraform, Plaid, PCI-DSS
"""


# ── Tests ───────────────────────────────────────────────────────────────────

def test_keyword_extraction():
    keywords = _extract_keywords(JOB_DESCRIPTION, top_n=20)
    assert len(keywords) > 0
    # Should extract meaningful terms, not stop words
    assert "the" not in keywords
    assert "and" not in keywords
    # Should find key tech terms
    keyword_text = " ".join(keywords)
    assert "python" in keyword_text or "typescript" in keyword_text
    print(f"✓ Extracted {len(keywords)} keywords: {keywords[:10]}...")


def test_keyword_coverage_good():
    result = score_keyword_coverage(JOB_DESCRIPTION, GOOD_TAILORED)
    assert result["score"] > 50, f"Good resume should score >50, got {result['score']}"
    assert len(result["matched"]) > 5
    print(f"✓ Good resume keyword coverage: {result['score']}/100 ({len(result['matched'])} matched)")


def test_keyword_coverage_bad():
    # Empty resume should score near 0
    result = score_keyword_coverage(JOB_DESCRIPTION, "John Doe\nNo relevant experience.")
    assert result["score"] < 20, f"Empty resume should score <20, got {result['score']}"
    print(f"✓ Bad resume keyword coverage: {result['score']}/100")


def test_skill_extraction():
    skills = _extract_skills(ORIGINAL_RESUME)
    assert "python" in skills
    assert "react" in skills
    assert "fastapi" in skills
    assert "postgresql" in skills
    print(f"✓ Extracted skills: {sorted(skills)}")


def test_hallucination_good():
    result = detect_hallucinations(ORIGINAL_RESUME, GOOD_TAILORED)
    assert result["score"] >= 70, f"Good tailoring shouldn't hallucinate much, got {result['score']}"
    print(f"✓ Good resume hallucination score: {result['score']}/100, hallucinated: {result['hallucinated_skills']}")


def test_hallucination_bad():
    result = detect_hallucinations(ORIGINAL_RESUME, BAD_TAILORED)
    assert len(result["hallucinated_skills"]) > 0, "Bad resume should have hallucinated skills"
    # Kafka, GraphQL, Kubernetes, Terraform, Plaid should be flagged
    halluc = set(result["hallucinated_skills"])
    assert "kafka" in halluc or "kubernetes" in halluc or "graphql" in halluc or "terraform" in halluc, \
        f"Should detect fabricated skills, found: {halluc}"
    print(f"✓ Bad resume hallucination score: {result['score']}/100, flagged: {sorted(halluc)}")


def test_change_delta_good():
    result = measure_change_delta(ORIGINAL_RESUME, GOOD_TAILORED)
    assert result["verdict"] == "well_tailored", f"Expected well_tailored, got {result['verdict']}"
    print(f"✓ Good resume change: {result['change_percent']}% changed, verdict: {result['verdict']}")


def test_change_delta_minimal():
    # Same text should show minimal change
    result = measure_change_delta(ORIGINAL_RESUME, ORIGINAL_RESUME)
    assert result["change_percent"] < 5, f"Identical text should show <5% change, got {result['change_percent']}"
    assert result["verdict"] == "minimal_change"
    print(f"✓ Identical resume change: {result['change_percent']}%, verdict: {result['verdict']}")


def test_full_eval_good():
    result = evaluate_tailored_resume(ORIGINAL_RESUME, GOOD_TAILORED, JOB_DESCRIPTION)
    assert result.overall_score > 40, f"Good tailored resume should score >40 overall, got {result.overall_score}"
    d = result.to_dict()
    assert "keyword_coverage" in d
    assert "hallucination_check" in d
    assert "change_delta" in d
    print(f"\n{'='*60}")
    print(f"FULL EVAL — Good Resume")
    print(f"{'='*60}")
    print(f"  Overall:      {result.overall_score}/100")
    print(f"  Keywords:     {result.keyword_score}/100 ({len(result.keywords_matched)} matched, {len(result.keywords_missing)} missing)")
    print(f"  Hallucination:{result.hallucination_score}/100 (flagged: {result.hallucinated_skills})")
    print(f"  Change Delta: {result.change_score}/100 ({result.change_percent}% changed, {result.change_verdict})")


def test_full_eval_bad():
    result = evaluate_tailored_resume(ORIGINAL_RESUME, BAD_TAILORED, JOB_DESCRIPTION)
    # Bad resume might score well on keywords but poorly on hallucination
    assert result.hallucination_score < result.keyword_score or len(result.hallucinated_skills) > 0
    print(f"\n{'='*60}")
    print(f"FULL EVAL — Bad Resume (hallucinated)")
    print(f"{'='*60}")
    print(f"  Overall:      {result.overall_score}/100")
    print(f"  Keywords:     {result.keyword_score}/100")
    print(f"  Hallucination:{result.hallucination_score}/100 (flagged: {result.hallucinated_skills})")
    print(f"  Change Delta: {result.change_score}/100 ({result.change_percent}% changed, {result.change_verdict})")


if __name__ == "__main__":
    tests = [
        test_keyword_extraction,
        test_keyword_coverage_good,
        test_keyword_coverage_bad,
        test_skill_extraction,
        test_hallucination_good,
        test_hallucination_bad,
        test_change_delta_good,
        test_change_delta_minimal,
        test_full_eval_good,
        test_full_eval_bad,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except AssertionError as e:
            print(f"✗ {t.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {t.__name__}: {type(e).__name__}: {e}")
            failed += 1

    print(f"\n{'='*60}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)}")
    if failed == 0:
        print("All tests passed! ✓")
