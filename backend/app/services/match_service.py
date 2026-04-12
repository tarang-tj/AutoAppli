"""Job-resume match scoring — lightweight TF-IDF keyword overlap.

Computes how well a resume text matches a job description, returning a 0-100
score plus the top matched and missing keywords. No AI API calls needed.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any


# ── Known skill terms (boosted during extraction) ──────────────────────

_SKILL_TERMS: frozenset[str] = frozenset({
    "python", "java", "javascript", "typescript", "react", "angular", "vue",
    "node", "express", "django", "flask", "fastapi", "spring", "sql",
    "nosql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
    "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd",
    "git", "linux", "bash", "rest", "graphql", "grpc", "kafka", "rabbitmq",
    "spark", "hadoop", "airflow", "dbt", "tableau", "looker", "powerbi",
    "excel", "r", "matlab", "scala", "go", "rust", "c++", "c#", "swift",
    "kotlin", "flutter", "figma", "sketch", "jira", "confluence", "agile",
    "scrum", "product", "analytics", "machine", "learning", "deep",
    "tensorflow", "pytorch", "nlp", "llm", "rag", "langchain", "openai",
    "anthropic", "claude", "data", "pipeline", "etl", "warehouse",
    "snowflake", "bigquery", "redshift", "pandas", "numpy", "scikit",
    "matplotlib", "seaborn", "plotly", "jupyter", "notebook",
    "html", "css", "tailwind", "sass", "webpack", "vite", "nextjs",
    "remix", "svelte", "supabase", "firebase", "vercel", "netlify",
    "communication", "leadership", "collaboration", "strategy",
    "operations", "management", "stakeholder", "metrics", "kpi",
})

_STOP_WORDS: frozenset[str] = frozenset({
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "this", "that", "these",
    "those", "it", "its", "i", "we", "you", "they", "he", "she", "my",
    "your", "our", "their", "what", "which", "who", "whom", "where",
    "when", "how", "not", "no", "nor", "if", "then", "than", "so",
    "as", "up", "out", "about", "into", "over", "after", "before",
    "between", "under", "above", "such", "each", "every", "all", "any",
    "both", "few", "more", "most", "other", "some", "very", "just",
    "also", "too", "only", "own", "same", "new", "well", "now",
    "even", "way", "part", "able", "like", "year", "years", "work",
    "working", "experience", "role", "team", "company", "join",
    "looking", "ideal", "candidate", "including", "using", "across",
    "etc", "strong", "highly", "key", "based", "within",
})

_TOKEN_RE = re.compile(r"[a-z][a-z0-9+#/.]+", re.IGNORECASE)


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text)]


def _extract_keywords(text: str) -> Counter[str]:
    """Extract weighted keyword counts from text."""
    tokens = _tokenize(text)
    counts: Counter[str] = Counter()
    for t in tokens:
        if t in _STOP_WORDS or len(t) < 2:
            continue
        weight = 3 if t in _SKILL_TERMS else 1
        counts[t] += weight
    return counts


def compute_match_score(
    resume_text: str,
    job_description: str,
) -> dict[str, Any]:
    """Compute how well a resume matches a job description.

    Returns:
        {
            "score": int (0-100),
            "matched_keywords": list[str],
            "missing_keywords": list[str],
            "top_job_keywords": list[str],
        }
    """
    if not resume_text or not job_description:
        return {
            "score": 0,
            "matched_keywords": [],
            "missing_keywords": [],
            "top_job_keywords": [],
        }

    jd_kw = _extract_keywords(job_description)
    resume_kw = _extract_keywords(resume_text)

    # Top job keywords by weight (deduplicate, take top 30)
    top_jd = [kw for kw, _ in jd_kw.most_common(30)]

    matched = [kw for kw in top_jd if kw in resume_kw]
    missing = [kw for kw in top_jd if kw not in resume_kw]

    # Score: weighted overlap ratio
    if not top_jd:
        return {
            "score": 0,
            "matched_keywords": matched,
            "missing_keywords": missing,
            "top_job_keywords": top_jd,
        }

    # Weight matched keywords by their JD importance
    total_jd_weight = sum(jd_kw[kw] for kw in top_jd)
    matched_weight = sum(jd_kw[kw] for kw in matched)

    raw_ratio = matched_weight / total_jd_weight if total_jd_weight > 0 else 0

    # Apply sigmoid-like curve: 50% match → ~70 score, 80% → ~90
    score = int(min(100, raw_ratio * 120))
    score = max(0, min(100, score))

    return {
        "score": score,
        "matched_keywords": matched[:15],
        "missing_keywords": missing[:10],
        "top_job_keywords": top_jd[:20],
    }


def compute_batch_match_scores(
    resume_text: str,
    jobs: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Compute match scores for multiple jobs against one resume.

    Returns: { job_id: { score, matched_keywords, missing_keywords } }
    """
    results: dict[str, dict[str, Any]] = {}
    for job in jobs:
        jd = job.get("description") or ""
        job_id = job.get("id", "")
        if not jd:
            results[job_id] = {
                "score": 0,
                "matched_keywords": [],
                "missing_keywords": [],
                "top_job_keywords": [],
            }
        else:
            results[job_id] = compute_match_score(resume_text, jd)
    return results
