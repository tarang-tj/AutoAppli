"""
Resume Eval Pipeline — Phase 1A of AutoAppli Deepening.

Scores a tailored resume against the original resume and job description
across three dimensions:

1. **Keyword Coverage** — What % of the JD's important terms appear in the
   tailored resume?  Uses TF-IDF-style extraction (no ML deps) to pull
   meaningful phrases from the JD, then checks presence in the output.

2. **Hallucination Detection** — Flags skills, technologies, or credentials
   that appear in the tailored resume but were *not* in the original.
   These are things the model may have invented.

3. **Change Delta** — Measures how much the resume actually changed
   (sentence-level diff ratio).  Too low = the model barely did anything.
   Too high = it rewrote your identity.

All three scores are 0-100 and combine into a single composite.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from difflib import SequenceMatcher


# ── Stop words (lightweight, no NLTK needed) ───────────────────────────────

_STOP_WORDS: frozenset[str] = frozenset(
    """
    a about above after again against all am an and any are as at be because been
    before being below between both but by can could did do does doing down during
    each few for from further get got had has have having he her here hers herself
    him himself his how i if in into is it its itself just let like ll m me might
    more most must my myself no nor not now o of off on once only or other our ours
    ourselves out over own re s same shall she should so some still such t than that
    the their theirs them themselves then there these they this those through to too
    under until up us ve very was we were what when where which while who whom why
    will with would you your yours yourself yourselves able also always another
    anyone anything around ask away back become best better big come could day
    different don each even every feel find first give go going good great hand
    help here high home house include keep know large last leave left life little
    long look made make man many may move much must name need never new next number
    often old one open own part people place point provide put read right run said
    say she show small something state still take tell thing think too try turn
    use want well will work world would write year
    the and or but with for from this that which have been will are was were
    has had not been can could would should may might shall into than more most
    very such only other also just about over after before between through during
    without within along across upon their there these those your what when where
    who how each every both few some any all most several many much
    """.split()
)

# Common tech-skill tokens to watch for hallucination detection
_SKILL_INDICATORS: frozenset[str] = frozenset(
    """
    python java javascript typescript c++ c# ruby go rust swift kotlin php perl
    scala r matlab sql nosql html css react angular vue svelte next nuxt django
    flask fastapi spring express nest rails laravel dotnet asp
    aws azure gcp firebase heroku vercel docker kubernetes terraform ansible
    jenkins circleci github gitlab bitbucket jira confluence
    postgresql mysql mongodb redis elasticsearch kafka rabbitmq dynamodb
    graphql rest grpc websocket
    tensorflow pytorch scikit keras opencv pandas numpy scipy
    figma sketch photoshop illustrator
    agile scrum kanban devops ci cd mlops
    node nodejs deno bun webpack vite rollup babel eslint prettier
    linux unix bash shell powershell
    certified certification pmp cpa cfa series aws-certified
    phd mba masters bachelors degree
    """.split()
)


# ── Text utilities ──────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    """Lowercase tokens, letters/digits/hyphens only."""
    return re.findall(r"[a-z][a-z0-9+#.\-]*", text.lower())


def _extract_ngrams(tokens: list[str], n: int) -> list[str]:
    """Extract n-grams as joined strings."""
    return [" ".join(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]


def _sentences(text: str) -> list[str]:
    """Split text into rough sentences."""
    parts = re.split(r"(?<=[.!?])\s+|\n{2,}|\n(?=[A-Z•\-\*])", text)
    return [s.strip() for s in parts if s.strip() and len(s.strip()) > 10]


# ── 1. Keyword Coverage ────────────────────────────────────────────────────

def _extract_keywords(text: str, top_n: int = 40) -> list[str]:
    """
    Extract the most important keywords/phrases from text using
    term-frequency with stop-word filtering.  Prioritizes tech terms
    and skill-like tokens.  Returns unigrams and selected bigrams.
    """
    tokens = _tokenize(text)
    meaningful = [t for t in tokens if t not in _STOP_WORDS and len(t) > 2]

    # Unigrams
    freq = Counter(meaningful)

    # Boost known skill/tech terms significantly
    combined: dict[str, float] = {}
    for token, count in freq.items():
        boost = 3.0 if token in _SKILL_INDICATORS else 1.0
        combined[token] = count * boost

    # Bigrams — only keep those where BOTH words are skill/tech terms
    # (e.g. "machine learning", "rest apis", "ci cd") to avoid noise like
    # "experience python" or "typescript strong"
    _bigram_noise = {"experience", "years", "strong", "senior", "looking", "startup",
                     "team", "engineer", "developer", "role", "company", "building",
                     "working", "based", "level", "type", "using", "modern",
                     "preferred", "familiarity", "understanding", "knowledge",
                     "services", "contributions", "pipelines", "architectures",
                     "processing", "design", "management", "platform", "systems"}
    bigrams = _extract_ngrams(meaningful, 2)
    bigram_freq = Counter(bigrams)
    for bigram, count in bigram_freq.items():
        parts = bigram.split()
        # Both parts must be non-noise; at least one should be a skill
        if any(p in _bigram_noise for p in parts):
            continue
        has_skill = any(p in _SKILL_INDICATORS for p in parts)
        if not has_skill and count < 2:
            continue
        combined[bigram] = count * (2.0 if has_skill else 1.2)

    # Filter out very generic job-posting words that don't help with matching
    generic_jd_words = {"experience", "years", "strong", "excellent", "looking",
                        "startup", "requirements", "preferred", "required", "similar",
                        "knowledge", "understanding", "familiarity", "contributions",
                        "nice", "projects", "skills", "communication", "solving",
                        "problem-solving", "regulations"}
    combined = {k: v for k, v in combined.items()
                if k not in generic_jd_words or k in _SKILL_INDICATORS}

    ranked = sorted(combined.items(), key=lambda x: x[1], reverse=True)
    return [kw for kw, _ in ranked[:top_n]]


def score_keyword_coverage(
    job_description: str, tailored_resume: str
) -> dict:
    """
    Score how well the tailored resume covers keywords from the JD.

    Returns:
        {
            "score": 0-100,
            "matched": [...],
            "missing": [...],
            "total_keywords": int,
        }
    """
    jd_keywords = _extract_keywords(job_description, top_n=40)
    resume_lower = tailored_resume.lower()

    matched = []
    missing = []

    for kw in jd_keywords:
        if kw in resume_lower:
            matched.append(kw)
        else:
            missing.append(kw)

    total = len(jd_keywords) or 1
    score = round((len(matched) / total) * 100)

    return {
        "score": score,
        "matched": matched,
        "missing": missing[:15],  # Cap missing list for readability
        "total_keywords": total,
    }


# ── 2. Hallucination Detection ─────────────────────────────────────────────

def _extract_skills(text: str) -> set[str]:
    """Pull out skill-like tokens from text."""
    tokens = set(_tokenize(text))
    # Direct skill matches
    skills = tokens & _SKILL_INDICATORS
    # Also grab anything that looks like a tech term (contains digits, ++, #)
    for t in tokens:
        if re.search(r"\d|[+#]", t) and len(t) >= 2:
            skills.add(t)
    return skills


def _extract_credentials(text: str) -> set[str]:
    """Extract credential-like phrases (certifications, degrees)."""
    creds: set[str] = set()
    patterns = [
        r"(?:certified|certification)\s+\w+(?:\s+\w+)?",
        r"(?:pmp|cpa|cfa|aws[- ]certified|google[- ]certified)\b",
        r"\b(?:ph\.?d|mba|m\.?s\.?|b\.?s\.?|b\.?a\.?)\b",
    ]
    lower = text.lower()
    for pat in patterns:
        for m in re.finditer(pat, lower):
            creds.add(m.group().strip())
    return creds


def detect_hallucinations(
    original_resume: str, tailored_resume: str
) -> dict:
    """
    Find skills/credentials in the tailored resume that weren't in the original.

    Returns:
        {
            "score": 0-100 (100 = no hallucinations),
            "hallucinated_skills": [...],
            "hallucinated_credentials": [...],
            "original_skill_count": int,
            "tailored_skill_count": int,
        }
    """
    orig_skills = _extract_skills(original_resume)
    tail_skills = _extract_skills(tailored_resume)
    halluc_skills = tail_skills - orig_skills

    orig_creds = _extract_credentials(original_resume)
    tail_creds = _extract_credentials(tailored_resume)
    halluc_creds = tail_creds - orig_creds

    # Score: penalize for each hallucinated item
    total_new = len(halluc_skills) + len(halluc_creds)
    total_tailored = len(tail_skills) + len(tail_creds) or 1
    # 100 means clean, 0 means everything is fabricated
    score = max(0, round(100 * (1 - (total_new / total_tailored))))

    return {
        "score": score,
        "hallucinated_skills": sorted(halluc_skills),
        "hallucinated_credentials": sorted(halluc_creds),
        "original_skill_count": len(orig_skills),
        "tailored_skill_count": len(tail_skills),
    }


# ── 3. Change Delta ────────────────────────────────────────────────────────

def measure_change_delta(
    original_resume: str, tailored_resume: str
) -> dict:
    """
    Measure how much the resume changed.

    Returns:
        {
            "score": 0-100 (ideal range: 20-60),
            "similarity_ratio": float,
            "verdict": str,
            "added_sentences": int,
            "removed_sentences": int,
        }
    """
    # Token-level similarity
    orig_tokens = _tokenize(original_resume)
    tail_tokens = _tokenize(tailored_resume)
    matcher = SequenceMatcher(None, orig_tokens, tail_tokens)
    similarity = matcher.ratio()

    # Sentence-level diff
    orig_sentences = set(_sentences(original_resume))
    tail_sentences = set(_sentences(tailored_resume))
    added = len(tail_sentences - orig_sentences)
    removed = len(orig_sentences - tail_sentences)

    # Score: we want meaningful change (20-60% different is ideal)
    change_pct = (1 - similarity) * 100

    if change_pct < 10:
        score = round(change_pct * 3)  # Too little change
        verdict = "minimal_change"
    elif change_pct <= 60:
        score = round(60 + (change_pct - 10) * 0.8)  # Sweet spot
        verdict = "well_tailored"
    else:
        score = max(20, round(100 - (change_pct - 60) * 1.5))  # Too much change
        verdict = "heavily_rewritten"

    score = max(0, min(100, score))

    return {
        "score": score,
        "similarity_ratio": round(similarity, 3),
        "change_percent": round(change_pct, 1),
        "verdict": verdict,
        "added_sentences": added,
        "removed_sentences": removed,
    }


# ── Composite Eval ──────────────────────────────────────────────────────────

@dataclass
class EvalResult:
    """Full evaluation result for a tailored resume."""

    # Composite
    overall_score: int = 0

    # Keyword coverage
    keyword_score: int = 0
    keywords_matched: list[str] = field(default_factory=list)
    keywords_missing: list[str] = field(default_factory=list)
    total_keywords: int = 0

    # Hallucination
    hallucination_score: int = 0
    hallucinated_skills: list[str] = field(default_factory=list)
    hallucinated_credentials: list[str] = field(default_factory=list)

    # Change delta
    change_score: int = 0
    change_percent: float = 0.0
    change_verdict: str = ""
    similarity_ratio: float = 0.0
    added_sentences: int = 0
    removed_sentences: int = 0

    def to_dict(self) -> dict:
        return {
            "overall_score": self.overall_score,
            "keyword_coverage": {
                "score": self.keyword_score,
                "matched": self.keywords_matched,
                "missing": self.keywords_missing,
                "total_keywords": self.total_keywords,
            },
            "hallucination_check": {
                "score": self.hallucination_score,
                "hallucinated_skills": self.hallucinated_skills,
                "hallucinated_credentials": self.hallucinated_credentials,
            },
            "change_delta": {
                "score": self.change_score,
                "change_percent": self.change_percent,
                "similarity_ratio": self.similarity_ratio,
                "verdict": self.change_verdict,
                "added_sentences": self.added_sentences,
                "removed_sentences": self.removed_sentences,
            },
        }


def evaluate_tailored_resume(
    original_resume: str,
    tailored_resume: str,
    job_description: str,
    *,
    weights: tuple[float, float, float] = (0.45, 0.35, 0.20),
) -> EvalResult:
    """
    Run the full eval pipeline on a tailored resume.

    Args:
        original_resume: The user's original resume text.
        tailored_resume: The AI-tailored output.
        job_description: The target job description.
        weights: (keyword_weight, hallucination_weight, change_weight).

    Returns:
        EvalResult with all scores and details.
    """
    kw = score_keyword_coverage(job_description, tailored_resume)
    hal = detect_hallucinations(original_resume, tailored_resume)
    delta = measure_change_delta(original_resume, tailored_resume)

    w_kw, w_hal, w_delta = weights
    overall = round(kw["score"] * w_kw + hal["score"] * w_hal + delta["score"] * w_delta)
    overall = max(0, min(100, overall))

    return EvalResult(
        overall_score=overall,
        keyword_score=kw["score"],
        keywords_matched=kw["matched"],
        keywords_missing=kw["missing"],
        total_keywords=kw["total_keywords"],
        hallucination_score=hal["score"],
        hallucinated_skills=hal["hallucinated_skills"],
        hallucinated_credentials=hal["hallucinated_credentials"],
        change_score=delta["score"],
        change_percent=delta["change_percent"],
        change_verdict=delta["verdict"],
        similarity_ratio=delta["similarity_ratio"],
        added_sentences=delta["added_sentences"],
        removed_sentences=delta["removed_sentences"],
    )
