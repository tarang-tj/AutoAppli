"""Export service — CSV, JSON, and summary report generation for jobs."""

from __future__ import annotations

import csv
import io
import json
from collections import Counter
from datetime import datetime, timezone
from typing import Any


def export_jobs_csv(jobs: list[dict[str, Any]]) -> str:
    """Convert jobs list to CSV string.

    Includes: id, company, title, url, status, source, applied_at, notes, created_at
    """
    if not jobs:
        return ""

    fieldnames = ["id", "company", "title", "url", "status", "source", "applied_at", "notes", "created_at"]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for job in jobs:
        writer.writerow(job)
    return output.getvalue()


def export_jobs_json(jobs: list[dict[str, Any]]) -> str:
    """Convert jobs list to JSON string."""
    return json.dumps(jobs, indent=2, default=str)


def generate_summary_report(jobs: list[dict[str, Any]]) -> dict[str, Any]:
    """Generate a summary report with key statistics from jobs.

    Returns:
        dict with:
        - total_jobs: int
        - by_status: dict of status -> count
        - by_source: dict of source -> count
        - by_company: dict of company -> count (top 10)
        - avg_days_in_pipeline: float or None
        - weekly_application_rate: dict
        - top_companies: list of {"company": str, "count": int}
    """
    total = len(jobs)

    # Status breakdown
    status_counts: dict[str, int] = Counter()
    for j in jobs:
        status_counts[j.get("status", "bookmarked")] += 1
    by_status = dict(status_counts)

    # Source breakdown
    source_counts: dict[str, int] = Counter()
    for j in jobs:
        source_counts[j.get("source", "manual")] += 1
    by_source = dict(source_counts)

    # Company breakdown (top 10)
    company_counts: dict[str, int] = Counter()
    for j in jobs:
        if j.get("company"):
            company_counts[j["company"]] += 1
    top_companies = [
        {"company": c, "count": count}
        for c, count in company_counts.most_common(10)
    ]

    # Average days in pipeline
    durations = []
    for j in jobs:
        created = j.get("created_at")
        updated = j.get("updated_at")
        if created and updated:
            try:
                cd = datetime.fromisoformat(created.replace("Z", "+00:00"))
                ud = datetime.fromisoformat(updated.replace("Z", "+00:00"))
                days = abs((ud - cd).total_seconds()) / 86400
                durations.append(days)
            except (ValueError, AttributeError):
                pass

    avg_days = round(sum(durations) / len(durations), 1) if durations else None

    # Weekly application rate (past 8 weeks)
    now = datetime.now(timezone.utc)
    WEEK = 7 * 24 * 60 * 60
    weekly_activity = {}

    for week_offset in range(8):
        week_start = now.timestamp() - (8 - week_offset) * WEEK
        week_end = week_start + WEEK
        count = 0
        for j in jobs:
            try:
                ct = datetime.fromisoformat(j.get("created_at", "").replace("Z", "+00:00"))
                ts = ct.timestamp()
                if week_start <= ts < week_end:
                    count += 1
            except (ValueError, AttributeError):
                pass

        week_label = f"Week {week_offset + 1}"
        weekly_activity[week_label] = count

    return {
        "total_jobs": total,
        "by_status": by_status,
        "by_source": by_source,
        "by_company": dict(company_counts),
        "top_companies": top_companies,
        "avg_days_in_pipeline": avg_days,
        "weekly_application_rate": weekly_activity,
    }
