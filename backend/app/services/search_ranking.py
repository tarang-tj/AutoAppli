"""
Composite-score ranking for job search results.

Scoring model
-------------
Each ``JobSearchResult`` is scored along four axes and then sorted
descending by their weighted sum.

  Axis                  Weight   Description
  ------------------    ------   -------------------------------------------
  Lexical match         40%      BM25-inspired: token overlap between query
                                 and title (3×), company (2×), description
                                 snippet (1×).  Normalised by query length.
  Recency               25%      Exponential decay on ``posted_date``; half-
                                 life is RECENCY_HALF_LIFE_DAYS.  Missing
                                 date → neutral (0.5).
  Completeness          20%      Additive bonus for populated optional fields:
                                 salary (+0.3), location (+0.2), remote_type
                                 (+0.2), full description (+0.3).
  Source trust          15%      Structured ATS sources (Greenhouse / Lever /
                                 Ashby) are more reliable than live scrapers.

Tunable constants
-----------------
All four ``WEIGHT_*`` constants must sum to 1.0 (enforced at import time).
``RECENCY_HALF_LIFE_DAYS`` controls how fast freshness decays.
``SOURCE_TRUST_SCORES`` maps source strings to a 0–1 trust value.
"""
from __future__ import annotations

import math
import re
from datetime import datetime, timezone
from typing import Optional

from app.models.schemas import JobSearchResult

# ---------------------------------------------------------------------------
# Tunable weight constants  (must sum to 1.0)
# ---------------------------------------------------------------------------
WEIGHT_LEXICAL: float = 0.40
WEIGHT_RECENCY: float = 0.25
WEIGHT_COMPLETENESS: float = 0.20
WEIGHT_SOURCE_TRUST: float = 0.15

assert (
    abs(WEIGHT_LEXICAL + WEIGHT_RECENCY + WEIGHT_COMPLETENESS + WEIGHT_SOURCE_TRUST - 1.0)
    < 1e-9
), "Ranking weights must sum to 1.0"

# Half-life for recency decay (days)
RECENCY_HALF_LIFE_DAYS: float = 14.0

# Source trust scores (0.0–1.0)
SOURCE_TRUST_SCORES: dict[str, float] = {
    "greenhouse": 1.0,
    "lever": 1.0,
    "ashby": 1.0,
    "workable": 0.85,
    "smartrecruiters": 0.85,
    "weworkremotely": 0.80,
    "cached": 0.70,
    "indeed": 0.55,
    "unknown": 0.40,
}

# Default trust for any source string not in the map
_DEFAULT_TRUST: float = 0.50

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokenize(text: str) -> list[str]:
    """Lowercase, split on non-alphanumeric, return non-empty tokens."""
    return _TOKEN_RE.findall(text.lower())


def _parse_date(date_str: str) -> Optional[datetime]:
    """
    Try to parse ISO-8601 / common date strings.  Returns a timezone-aware
    datetime or None on parse failure.
    """
    if not date_str:
        return None
    # Strip trailing fractional seconds and timezone variations for simplicity
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(date_str[:26], fmt)  # 26 chars covers up to +HH:MM
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# Public scoring functions
# ---------------------------------------------------------------------------


def lexical_score(query: str, result: JobSearchResult) -> float:
    """
    BM25-inspired lexical overlap between query tokens and result text fields.

    Field weights:  title 3×, company 2×, description_snippet 1×.
    Score is normalised to [0, 1] by query token count.

    Returns 0.0 when query is empty or there is no overlap.
    """
    query_tokens = _tokenize(query)
    if not query_tokens:
        return 0.0

    query_set = set(query_tokens)

    def _weighted_overlap(text: str, weight: float) -> float:
        if not text:
            return 0.0
        field_tokens = set(_tokenize(text))
        overlap = len(query_set & field_tokens)
        return weight * overlap

    raw = (
        _weighted_overlap(result.title, 3.0)
        + _weighted_overlap(result.company, 2.0)
        + _weighted_overlap(result.description_snippet or "", 1.0)
    )

    # Max possible raw = (3+2+1) * len(query_tokens) when every query token
    # appears in every field.  We normalise to that ceiling.
    max_raw = 6.0 * len(query_tokens)
    return min(raw / max_raw, 1.0)


def recency_score(
    result: JobSearchResult,
    now: Optional[datetime] = None,
) -> float:
    """
    Exponential decay on ``posted_date``.

    score = 2^(-age_days / RECENCY_HALF_LIFE_DAYS)

    Returns 0.5 when date is absent (neutral — not penalised, not rewarded).
    ``now`` is injectable for deterministic testing.
    """
    if now is None:
        now = datetime.now(timezone.utc)

    if not result.posted_date:
        return 0.5

    dt = _parse_date(result.posted_date)
    if dt is None:
        return 0.5

    age_days = (now - dt).total_seconds() / 86400.0
    if age_days < 0:
        # Posted in the future — clamp to 1.0
        return 1.0

    return math.pow(2.0, -age_days / RECENCY_HALF_LIFE_DAYS)


def completeness_score(result: JobSearchResult) -> float:
    """
    Additive bonus for populated optional fields.

      salary present      +0.3
      location set        +0.2
      source not unknown  +0.2
      full description    +0.3  (snippet > 100 chars is treated as "full enough")

    Capped to 1.0.
    """
    score = 0.0
    if result.salary:
        score += 0.3
    if result.location:
        score += 0.2
    if result.source and result.source.lower() not in ("unknown", ""):
        score += 0.2
    snippet = result.description_snippet or ""
    if len(snippet) > 100:
        score += 0.3
    return min(score, 1.0)


def source_trust_score(result: JobSearchResult) -> float:
    """
    Return the pre-defined trust level for the result's source string.
    Falls back to ``_DEFAULT_TRUST`` for unmapped source values.
    """
    key = (result.source or "unknown").lower().strip()
    return SOURCE_TRUST_SCORES.get(key, _DEFAULT_TRUST)


def composite_score(
    query: str,
    result: JobSearchResult,
    now: Optional[datetime] = None,
) -> float:
    """
    Weighted sum of the four component scores.

    Returns a float in [0, 1].
    """
    return (
        WEIGHT_LEXICAL * lexical_score(query, result)
        + WEIGHT_RECENCY * recency_score(result, now=now)
        + WEIGHT_COMPLETENESS * completeness_score(result)
        + WEIGHT_SOURCE_TRUST * source_trust_score(result)
    )


# ---------------------------------------------------------------------------
# Public ranking entry-point
# ---------------------------------------------------------------------------


def rank_results(
    query: str,
    results: list[JobSearchResult],
    now: Optional[datetime] = None,
) -> list[JobSearchResult]:
    """
    Return ``results`` sorted descending by ``composite_score``.

    Complexity: O(n log n).  Pure function — does not mutate the input list.

    When ``query`` is empty the original insertion order is preserved (the
    "browse all" use-case where lexical ranking is meaningless).
    """
    if not query or not query.strip():
        return list(results)

    return sorted(
        results,
        key=lambda r: composite_score(query, r, now=now),
        reverse=True,
    )
