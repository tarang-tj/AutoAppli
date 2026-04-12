"""Analytics service — computes funnel metrics, stage durations, and activity stats from job data."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any


# ── Status pipeline order ──────────────────────────────────────────────────

_STATUS_ORDER = ("bookmarked", "applied", "interviewing", "offer", "rejected", "ghosted")

_FUNNEL_STAGES = ("bookmarked", "applied", "interviewing", "offer")


def _parse_dt(val: str | None) -> datetime | None:
    if not val:
        return None
    try:
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _days_between(a: str | None, b: str | None) -> float | None:
    """Return days between two ISO timestamps, or None if either is missing."""
    da, db = _parse_dt(a), _parse_dt(b)
    if da is None or db is None:
        return None
    diff = abs((db - da).total_seconds()) / 86400
    return round(diff, 1)


# ── Core analytics computation ─────────────────────────────────────────────


def compute_analytics(jobs: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute full analytics payload from a list of job dicts.

    Each job dict should have at minimum: id, status, created_at, updated_at.
    Optional: applied_at, source, company.
    """
    now = datetime.now(timezone.utc)
    total = len(jobs)

    # ── 1. Pipeline funnel counts ──────────────────────────────────────
    status_counts: dict[str, int] = Counter()
    for j in jobs:
        status_counts[j.get("status", "bookmarked")] += 1

    funnel = [
        {"stage": s, "count": status_counts.get(s, 0)}
        for s in _STATUS_ORDER
    ]

    # ── 2. Conversion rates ────────────────────────────────────────────
    applied_total = sum(
        1 for j in jobs if j.get("status") in ("applied", "interviewing", "offer", "rejected", "ghosted")
    )
    interviewing_total = sum(
        1 for j in jobs if j.get("status") in ("interviewing", "offer")
    )
    offer_total = status_counts.get("offer", 0)
    rejected_total = status_counts.get("rejected", 0)
    ghosted_total = status_counts.get("ghosted", 0)

    conversions = {
        "bookmarked_to_applied": _rate(applied_total, total),
        "applied_to_interviewing": _rate(interviewing_total, applied_total),
        "interviewing_to_offer": _rate(offer_total, interviewing_total),
        "rejection_rate": _rate(rejected_total, applied_total),
        "ghost_rate": _rate(ghosted_total, applied_total),
    }

    # ── 3. Time-in-stage averages ──────────────────────────────────────
    stage_durations: dict[str, list[float]] = {
        "bookmarked_to_applied": [],
        "applied_to_latest": [],
        "total_lifecycle": [],
    }

    for j in jobs:
        created = j.get("created_at")
        updated = j.get("updated_at")
        applied_at = j.get("applied_at")

        # Bookmarked → Applied
        if applied_at and created:
            d = _days_between(created, applied_at)
            if d is not None:
                stage_durations["bookmarked_to_applied"].append(d)

        # Applied → Latest update (proxy for time in interview pipeline)
        if applied_at and updated and j.get("status") in ("interviewing", "offer", "rejected", "ghosted"):
            d = _days_between(applied_at, updated)
            if d is not None:
                stage_durations["applied_to_latest"].append(d)

        # Total lifecycle
        if created and updated:
            d = _days_between(created, updated)
            if d is not None:
                stage_durations["total_lifecycle"].append(d)

    avg_durations = {
        k: round(sum(v) / len(v), 1) if v else None
        for k, v in stage_durations.items()
    }

    # ── 4. Source breakdown ────────────────────────────────────────────
    source_counts: dict[str, int] = Counter()
    for j in jobs:
        source_counts[j.get("source", "unknown")] += 1

    sources = [
        {"source": s, "count": c}
        for s, c in sorted(source_counts.items(), key=lambda x: -x[1])
    ]

    # ── 5. Weekly activity (last 8 weeks) ──────────────────────────────
    weekly_activity = _compute_weekly_activity(jobs, now, weeks=8)

    # ── 6. Top companies by count ──────────────────────────────────────
    company_counts: dict[str, int] = Counter()
    for j in jobs:
        co = (j.get("company") or "").strip()
        if co:
            company_counts[co] += 1
    top_companies = [
        {"company": c, "count": n}
        for c, n in sorted(company_counts.items(), key=lambda x: -x[1])[:10]
    ]

    # ── 7. Response rate (jobs past bookmarked that got some signal) ──
    responded = sum(
        1 for j in jobs if j.get("status") in ("interviewing", "offer", "rejected")
    )
    response_rate = _rate(responded, applied_total)

    return {
        "total_jobs": total,
        "funnel": funnel,
        "conversions": conversions,
        "avg_durations_days": avg_durations,
        "sources": sources,
        "weekly_activity": weekly_activity,
        "top_companies": top_companies,
        "response_rate": response_rate,
        "summary": {
            "active_applications": applied_total - rejected_total - ghosted_total,
            "interviews_in_progress": status_counts.get("interviewing", 0),
            "offers": offer_total,
            "rejections": rejected_total,
        },
    }


# ── Helpers ────────────────────────────────────────────────────────────────


def _rate(numerator: int, denominator: int) -> float:
    """Return percentage rate, clamped 0-100."""
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 1)


def _compute_weekly_activity(
    jobs: list[dict[str, Any]], now: datetime, weeks: int = 8
) -> list[dict[str, Any]]:
    """Count jobs created per week for the last N weeks."""
    buckets: list[dict[str, Any]] = []
    for w in range(weeks - 1, -1, -1):
        from datetime import timedelta

        week_end = now - timedelta(weeks=w)
        week_start = week_end - timedelta(weeks=1)
        count = 0
        for j in jobs:
            created = _parse_dt(j.get("created_at"))
            if created and week_start <= created < week_end:
                count += 1
        buckets.append({
            "week_start": week_start.strftime("%b %d"),
            "week_end": week_end.strftime("%b %d"),
            "jobs_added": count,
        })
    return buckets
