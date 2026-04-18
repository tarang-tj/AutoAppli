"""
Match scoring v2 — Python mirror of frontend/src/lib/match/score.ts.

Weights, sub-score formulas, and headline buckets match the TS version so
whether the user is on a Vercel deploy with FastAPI or the Supabase-direct
frontend fallback, they see the same number.

Existing callers of `match_service.py` can migrate to `match_v2.score_match`
incrementally; the legacy service stays in place until the router is cut over.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Literal, Optional

from .taxonomy import (
    SKILLS,
    SENIORITY_RANK,
    CanonicalSkill,
    SeniorityLevel,
    normalize_skill,
    normalize_skill_list,
    resolve_seniority,
)

Signal = Literal["skills", "title", "seniority", "location", "remote", "recency", "salary"]

RemoteType = Literal["remote", "hybrid", "onsite"]


@dataclass
class JobProfile:
    title: str
    description: str = ""
    location: Optional[str] = None
    company: Optional[str] = None
    skills: list[str] = field(default_factory=list)
    seniority: Optional[SeniorityLevel] = None
    remote_type: Optional[RemoteType] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    posted_at: Optional[str] = None  # ISO8601
    id: Optional[str] = None


@dataclass
class CandidateProfile:
    skills: list[str] = field(default_factory=list)
    title: Optional[str] = None
    seniority: Optional[SeniorityLevel] = None
    years_of_experience: int = 0
    location: Optional[str] = None
    remote_preference: Optional[RemoteType] = None
    salary_target: Optional[int] = None
    resume_text: str = ""


@dataclass
class SignalContribution:
    signal: Signal
    raw: float
    weight: float
    points: float
    note: str


@dataclass
class MatchResult:
    score: float
    score_exact: float
    breakdown: list[SignalContribution]
    matched_skills: list[str]
    missing_skills: list[str]
    extra_skills: list[str]
    headline: str


DEFAULT_WEIGHTS: dict[Signal, float] = {
    "skills": 0.4,
    "title": 0.15,
    "seniority": 0.1,
    "location": 0.1,
    "remote": 0.1,
    "recency": 0.05,
    "salary": 0.1,
}


def _weights_valid(weights: dict[Signal, float]) -> bool:
    return abs(sum(weights.values()) - 1.0) < 1e-3


# --- Skill / title extraction (Python mirror of extract.ts) ---

def _escape_regex(s: str) -> str:
    return re.escape(s)


_SKILL_PATTERNS: list[tuple[re.Pattern[str], str]] = []


def _build_skill_patterns() -> list[tuple[re.Pattern[str], str]]:
    pairs: list[tuple[str, str]] = []
    for skill in SKILLS:
        pairs.append((skill.name, skill.name))
        for alias in skill.aliases:
            pairs.append((alias, skill.name))
    pairs.sort(key=lambda p: len(p[0]), reverse=True)
    patterns: list[tuple[re.Pattern[str], str]] = []
    for alias, canon in pairs:
        body = _escape_regex(alias)
        left = r"\b" if alias[:1].isalnum() else r"(?:^|[^a-z0-9])"
        right = r"\b" if alias[-1:].isalnum() else r"(?:$|[^a-z0-9])"
        patterns.append((re.compile(f"{left}{body}{right}", re.I), canon))
    return patterns


_SKILL_PATTERNS = _build_skill_patterns()


def extract_skills(text: Optional[str]) -> list[str]:
    if not text:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for pattern, canon in _SKILL_PATTERNS:
        if pattern.search(text) and canon not in seen:
            seen.add(canon)
            out.append(canon)
    return out


_SENIORITY_TOKENS = {
    "junior", "jr", "senior", "sr", "staff", "principal", "lead", "manager", "director",
    "vp", "chief", "intern", "associate", "i", "ii", "iii", "iv", "v",
}


def _title_tokens(title: str) -> list[str]:
    t = title.lower().strip()
    t = re.sub(r"\(.*?\)", "", t)
    t = re.sub(r"[,\-–—|].*$", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return [tok for tok in t.split(" ") if tok and tok not in _SENIORITY_TOKENS]


def detect_remote_type(text: Optional[str]) -> Optional[RemoteType]:
    if not text:
        return None
    low = text.lower()
    if re.search(r"\bhybrid\b", low):
        return "hybrid"
    if re.search(r"\b(fully remote|100% remote|remote first|remote-first|work from home|wfh|distributed)\b", low):
        return "remote"
    if re.search(r"\bremote\b", low) and not re.search(r"\b(not remote|no remote|on[- ]?site required|in[- ]?office required)\b", low):
        return "remote"
    if re.search(r"\b(on[- ]?site|in[- ]?office|office based|office-based)\b", low):
        return "onsite"
    return None


# --- Sub-scores ---

def _skills_score(job: JobProfile, cand: CandidateProfile) -> tuple[float, list[str], list[str], list[str]]:
    job_skills = set(
        normalize_skill_list(job.skills)
        if job.skills else extract_skills(f"{job.title}\n{job.description}")
    )
    cand_skills = set(cand.skills)
    matched = [s for s in job_skills if s in cand_skills]
    missing = [s for s in job_skills if s not in cand_skills]
    extra = [s for s in cand_skills if s not in job_skills]

    if not job_skills:
        bonus = min(len(cand_skills) / 10, 1.0) * 0.6
        return 0.4 + bonus * 0.2, matched, missing, extra

    coverage = len(matched) / len(job_skills)
    relevance = len(matched) / len(cand_skills) if cand_skills else 0.0
    score = 0.75 * coverage + 0.25 * relevance
    return max(0.0, min(1.0, score)), matched, missing, extra


def _title_score(job: JobProfile, cand: CandidateProfile) -> float:
    if not cand.title:
        return 0.5
    job_t = set(_title_tokens(job.title))
    cand_t = set(_title_tokens(cand.title))
    if not job_t or not cand_t:
        return 0.5
    overlap = len(job_t & cand_t)
    union = len(job_t | cand_t)
    return overlap / union if union else 0.0


def _seniority_score(job: JobProfile, cand: CandidateProfile) -> tuple[float, str]:
    job_lvl = job.seniority or resolve_seniority(f"{job.title} {job.description}", "mid")
    cand_lvl = cand.seniority or (resolve_seniority(cand.title, "mid") if cand.title else "mid")
    job_rank = SENIORITY_RANK.get(job_lvl, 2)
    cand_rank = SENIORITY_RANK.get(cand_lvl, 2)
    gap = abs(job_rank - cand_rank)
    table = [1.0, 0.75, 0.45, 0.2, 0.05]
    score = table[min(gap, len(table) - 1)]
    if gap == 0:
        note = f"Exact seniority match ({job_lvl})"
    elif cand_rank > job_rank:
        note = f"Overqualified: {cand_lvl} applying to {job_lvl}"
    else:
        note = f"Stretch: {cand_lvl} applying to {job_lvl}"
    return score, note


def _location_score(job: JobProfile, cand: CandidateProfile) -> tuple[float, str]:
    job_loc = (job.location or "").lower().strip()
    cand_loc = (cand.location or "").lower().strip()
    job_remote = job.remote_type or detect_remote_type(f"{job.title} {job.description} {job.location or ''}")
    if job_remote == "remote":
        return 1.0, "Remote — location match not required"
    if not job_loc:
        return 0.6, "Location unspecified"
    if not cand_loc:
        return 0.5, "Candidate location unknown"
    if job_loc == cand_loc:
        return 1.0, "Exact location match"
    if job_loc in cand_loc or cand_loc in job_loc:
        return 0.85, "Same metro / partial match"
    job_last = job_loc.split(",")[-1].strip()
    cand_last = cand_loc.split(",")[-1].strip()
    if job_last and job_last == cand_last:
        return 0.5, "Same region/country, different metro"
    return 0.1, "Different location"


_COMPATIBILITY = {
    "remote": {"hybrid": 0.7, "onsite": 0.1},
    "hybrid": {"remote": 0.7, "onsite": 0.6},
    "onsite": {"hybrid": 0.6, "remote": 0.1},
}


def _remote_score(job: JobProfile, cand: CandidateProfile) -> tuple[float, str]:
    pref = cand.remote_preference
    job_remote = job.remote_type or detect_remote_type(f"{job.title} {job.description} {job.location or ''}")
    if pref is None:
        return 0.6, "No remote preference set"
    if job_remote is None:
        return 0.5, "Remote type not specified on posting"
    if pref == job_remote:
        return 1.0, f"Exact {pref} match"
    score = _COMPATIBILITY.get(pref, {}).get(job_remote, 0.3)
    return score, f"Candidate prefers {pref}, job is {job_remote}"


def _recency_score(job: JobProfile) -> tuple[float, str]:
    if not job.posted_at:
        return 0.5, "Posting date unknown"
    try:
        dt = datetime.fromisoformat(job.posted_at.replace("Z", "+00:00")) if isinstance(job.posted_at, str) else None
    except ValueError:
        dt = None
    if dt is None:
        return 0.5, "Posting date unparseable"
    now = datetime.now(timezone.utc) if dt.tzinfo else datetime.now()
    days = (now - dt).total_seconds() / 86400
    if days <= 7:
        return 1.0, "Posted within the past week"
    if days <= 30:
        return 0.8, f"Posted {round(days)} days ago"
    if days <= 60:
        return 0.5, f"Posted {round(days)} days ago"
    if days <= 90:
        return 0.3, f"Posted {round(days)} days ago"
    return 0.1, f"Stale posting ({round(days)} days old)"


def _salary_score(job: JobProfile, cand: CandidateProfile) -> tuple[float, str]:
    target = cand.salary_target
    _min = job.salary_min
    _max = job.salary_max
    if target is None:
        return 0.6, "No salary target set"
    if _min is None and _max is None:
        return 0.5, "Salary not disclosed"
    floor = _min if _min is not None else (_max if _max is not None else 0)
    ceiling = _max if _max is not None else (_min if _min is not None else 0)
    if target <= floor:
        return 1.0, f"Exceeds target (${_fmt_money(target)})"
    if target <= ceiling:
        return 0.85, "Within posted range"
    gap = (target - ceiling) / target
    if gap <= 0.1:
        return 0.6, f"Slightly below target ({round(gap * 100)}% short)"
    if gap <= 0.25:
        return 0.3, f"Below target ({round(gap * 100)}% short)"
    return 0.1, f"Far below target ({round(gap * 100)}% short)"


def _fmt_money(n: int) -> str:
    return f"{round(n / 1000)}k" if n >= 1000 else str(n)


def _headline(score: float, matched: int, missing: int) -> str:
    total = matched + missing
    if score >= 85:
        return f"Excellent fit — {matched}/{total} skills matched"
    if score >= 70:
        return "Strong fit — worth applying"
    if score >= 55:
        return "Solid fit with some gaps"
    if score >= 40:
        return "Possible fit — review before applying"
    return "Weak fit — consider skipping or tailoring heavily"


def score_match(
    job: JobProfile,
    candidate: CandidateProfile,
    weights: Optional[dict[Signal, float]] = None,
) -> MatchResult:
    w = weights or DEFAULT_WEIGHTS
    if not _weights_valid(w):
        raise ValueError(f"Invalid scoring weights — must sum to 1.0, got {w}")

    skills_raw, matched, missing, extra = _skills_score(job, candidate)
    title_raw = _title_score(job, candidate)
    sen_raw, sen_note = _seniority_score(job, candidate)
    loc_raw, loc_note = _location_score(job, candidate)
    rem_raw, rem_note = _remote_score(job, candidate)
    rec_raw, rec_note = _recency_score(job)
    sal_raw, sal_note = _salary_score(job, candidate)

    breakdown = [
        SignalContribution("skills", skills_raw, w["skills"], skills_raw * w["skills"] * 100,
                           f"{len(matched)}/{len(matched)+len(missing)} required skills matched" if (matched or missing) else "No skills detected on posting"),
        SignalContribution("title", title_raw, w["title"], title_raw * w["title"] * 100,
                           f"Role-family overlap vs \"{candidate.title}\"" if candidate.title else "No candidate title available"),
        SignalContribution("seniority", sen_raw, w["seniority"], sen_raw * w["seniority"] * 100, sen_note),
        SignalContribution("location", loc_raw, w["location"], loc_raw * w["location"] * 100, loc_note),
        SignalContribution("remote", rem_raw, w["remote"], rem_raw * w["remote"] * 100, rem_note),
        SignalContribution("recency", rec_raw, w["recency"], rec_raw * w["recency"] * 100, rec_note),
        SignalContribution("salary", sal_raw, w["salary"], sal_raw * w["salary"] * 100, sal_note),
    ]

    score_exact = sum(b.points for b in breakdown)
    score = round(score_exact * 10) / 10

    return MatchResult(
        score=score,
        score_exact=score_exact,
        breakdown=breakdown,
        matched_skills=matched,
        missing_skills=missing,
        extra_skills=extra,
        headline=_headline(score, len(matched), len(missing)),
    )


def rank_jobs(
    jobs: Iterable[JobProfile],
    candidate: CandidateProfile,
    weights: Optional[dict[Signal, float]] = None,
) -> list[tuple[JobProfile, MatchResult]]:
    scored = [(j, score_match(j, candidate, weights)) for j in jobs]
    scored.sort(key=lambda pair: pair[1].score_exact, reverse=True)
    return scored


# Dict helpers for FastAPI response serialization

def result_to_dict(r: MatchResult) -> dict:
    return {
        "score": r.score,
        "score_exact": r.score_exact,
        "breakdown": [
            {
                "signal": b.signal,
                "raw": b.raw,
                "weight": b.weight,
                "points": b.points,
                "note": b.note,
            }
            for b in r.breakdown
        ],
        "matched_skills": r.matched_skills,
        "missing_skills": r.missing_skills,
        "extra_skills": r.extra_skills,
        "headline": r.headline,
    }
