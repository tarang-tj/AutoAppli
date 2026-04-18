"""
Ashby public job-board ingestion.

Ashby exposes every customer's board as a public JSON feed at:
    https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true

No auth required for public boards. We fetch, normalize, and return a list
of `NormalizedJob` records.

Board identifiers are the short slugs Ashby assigns each customer:
    https://jobs.ashbyhq.com/anthropic   → board = "anthropic"
    https://jobs.ashbyhq.com/ramp        → board = "ramp"

Known behaviour:
    - Top-level shape is `{"apiVersion", "jobs": [ … ]}`.
    - Each job has `id` (UUID), `title`, `descriptionPlain` (or
      `descriptionHtml` which we strip), `locationName`, `employmentType`,
      `isRemote` (bool), `jobUrl`, `publishedAt` (ISO8601), and an optional
      `compensation` block with currencyCode/minValue/maxValue.
    - The board response sometimes includes `secondaryLocations` for
      multi-office roles.
"""
from __future__ import annotations

import html
import json
import re
import urllib.error
import urllib.request
from typing import Any, Iterable, Optional

from .base import JobSource, NormalizedJob, register_source


_USER_AGENT = "AutoAppli/1.0 (+https://github.com/tarang-tj/AutoAppli)"
_TAG_STRIP_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def _strip_html(raw: str) -> str:
    if not raw:
        return ""
    text = _TAG_STRIP_RE.sub(" ", raw)
    text = html.unescape(text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def _detect_remote(
    is_remote: Any, location: str, description: str, employment_type: Optional[str]
) -> Optional[str]:
    if is_remote is True:
        return "remote"
    low = f"{location} {description} {employment_type or ''}".lower()
    if "hybrid" in low:
        return "hybrid"
    if re.search(r"\bremote\b", low) and "on-site" not in low and "onsite" not in low:
        return "remote"
    if re.search(r"\b(on-?site|in-?office)\b", low):
        return "onsite"
    return None


def _compensation_range(comp: Any) -> tuple[Optional[int], Optional[int]]:
    """Extract (min, max) from Ashby's compensation block.

    Handles both the newer flat shape ({minValue, maxValue}) and the older
    summary-based shape ({summaryComponents: [{compensationTierSummary: …}]}).
    """
    if not isinstance(comp, dict):
        return (None, None)

    mn = comp.get("minValue")
    mx = comp.get("maxValue")
    if isinstance(mn, (int, float)) or isinstance(mx, (int, float)):
        return (
            int(mn) if isinstance(mn, (int, float)) else None,
            int(mx) if isinstance(mx, (int, float)) else None,
        )

    for summary in comp.get("summaryComponents") or []:
        tier = summary.get("compensationTierSummary") or {}
        mn = tier.get("minValue")
        mx = tier.get("maxValue")
        if isinstance(mn, (int, float)) or isinstance(mx, (int, float)):
            return (
                int(mn) if isinstance(mn, (int, float)) else None,
                int(mx) if isinstance(mx, (int, float)) else None,
            )
    return (None, None)


def _fetch_json(url: str, timeout: float = 20.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class AshbySource:
    """Fetch normalized jobs from Ashby public job boards."""

    name = "ashby"

    def fetch(self, identifiers: Iterable[str]) -> list[NormalizedJob]:
        out: list[NormalizedJob] = []
        for board in identifiers:
            board = (board or "").strip()
            if not board:
                continue
            try:
                payload = _fetch_json(
                    f"https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true"
                )
            except urllib.error.HTTPError as e:
                raise RuntimeError(f"Ashby board '{board}' fetch failed: HTTP {e.code}") from e
            except urllib.error.URLError as e:
                raise RuntimeError(f"Ashby board '{board}' fetch failed: {e.reason}") from e

            jobs = payload.get("jobs") or []
            for job in jobs:
                out.append(self._normalize(board, job))
        return out

    def _normalize(self, board: str, raw: dict[str, Any]) -> NormalizedJob:
        title = raw.get("title") or ""

        # Description — prefer plain text; fall back to HTML-stripped.
        desc_plain = raw.get("descriptionPlain")
        if not desc_plain:
            desc_plain = _strip_html(raw.get("descriptionHtml") or raw.get("description") or "")
        description = _WHITESPACE_RE.sub(" ", desc_plain or "").strip()

        # Primary + secondary locations merged for display.
        primary_loc = raw.get("locationName") or ""
        secondary = raw.get("secondaryLocations") or []
        if isinstance(secondary, list) and secondary:
            extra = [
                (s.get("locationName") if isinstance(s, dict) else str(s))
                for s in secondary[:2]
            ]
            extra = [e for e in extra if e]
            if extra:
                primary_loc = ", ".join([primary_loc, *extra]) if primary_loc else ", ".join(extra)

        employment_type = raw.get("employmentType")
        url = raw.get("jobUrl") or f"https://jobs.ashbyhq.com/{board}/{raw.get('id', '')}"
        posted_at = raw.get("publishedAt") or raw.get("updatedAt")

        remote_type = _detect_remote(raw.get("isRemote"), primary_loc, description, employment_type)
        sal_min, sal_max = _compensation_range(raw.get("compensation"))

        # Extract skills via the shared taxonomy extractor.
        from ..match_v2 import extract_skills as _extract
        skills = _extract(f"{title}\n{description}")

        tags = [t for t in (raw.get("departmentName"), employment_type) if t]

        return NormalizedJob(
            source=self.name,
            external_id=str(raw.get("id") or url),
            title=title,
            company=raw.get("organizationName") or raw.get("companyName") or board,
            url=url,
            description=description[:10_000],  # cap
            location=primary_loc or None,
            remote_type=remote_type,
            salary_min=sal_min,
            salary_max=sal_max,
            skills=skills,
            tags=tags,
            posted_at=posted_at,
        )


register_source("ashby", lambda: AshbySource())
