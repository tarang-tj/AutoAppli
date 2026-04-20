"""
SmartRecruiters public job-board ingestion.

SmartRecruiters exposes each company's public postings via:
    https://api.smartrecruiters.com/v1/companies/{company}/postings

No auth is required for the public Postings API. We fetch the list, then
fetch each posting's detail page (only one extra round-trip per posting)
to pull a real description out of the structured `jobAd.sections` block.

Company identifiers are the SmartRecruiters company slugs:
    https://jobs.smartrecruiters.com/Bosch    → company = "Bosch"
    https://jobs.smartrecruiters.com/Visa     → company = "Visa"

Known behaviour:
    - List endpoint shape: `{"offset", "limit", "totalFound", "content": [...]}`.
    - Each list item has `id`, `name` (title), `refNumber`, `company.identifier`,
      `company.name`, `location` ({"city", "region", "country", "remote",
      "fullLocation"}), `industry`, `department`, `releasedDate`, `createdOn`,
      `customField` (array), `applyUrl`, `ref`.
    - Detail endpoint shape: same fields plus `jobAd.sections.{companyDescription,
      jobDescription, qualifications, additionalInformation}.{title, text}`.
      Sections may be present individually, with HTML in their `text` field.

Performance:
    - We cap detail fetches per company to `_MAX_DETAIL_FETCHES` (default 50)
      to keep nightly cron runtime reasonable. Companies with more than 50
      postings will still see the first 50 ingested with full descriptions;
      remaining items get title + location only.
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
_MAX_DETAIL_FETCHES = 50  # per company, per run


def _strip_html(raw: str) -> str:
    if not raw:
        return ""
    text = _TAG_STRIP_RE.sub(" ", raw)
    text = html.unescape(text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def _detect_remote(
    location: dict[str, Any] | None, description: str
) -> Optional[str]:
    if isinstance(location, dict) and location.get("remote") is True:
        return "remote"
    flat = ""
    if isinstance(location, dict):
        flat = " ".join(
            str(v) for v in (location.get("fullLocation"), location.get("city"), location.get("country")) if v
        )
    low = f"{flat} {description}".lower()
    if "hybrid" in low:
        return "hybrid"
    if re.search(r"\bremote\b", low) and "on-site" not in low and "onsite" not in low:
        return "remote"
    if re.search(r"\b(on-?site|in-?office)\b", low):
        return "onsite"
    return None


def _format_location(loc: Any) -> str:
    if not isinstance(loc, dict):
        return str(loc or "")
    full = loc.get("fullLocation")
    if full:
        return str(full)
    parts = []
    for key in ("city", "region", "country"):
        v = loc.get(key)
        if v and v not in parts:
            parts.append(str(v))
    return ", ".join(parts)


def _extract_description(detail: dict[str, Any]) -> str:
    """Concatenate the meaningful sections of jobAd into a single text blob."""
    job_ad = detail.get("jobAd") or {}
    sections = job_ad.get("sections") or {}
    if not isinstance(sections, dict):
        return ""

    # Order matters for matching — put the role / qualifications first since
    # that's where the skill keywords live.
    section_order = (
        "jobDescription",
        "qualifications",
        "additionalInformation",
        "companyDescription",
    )
    pieces: list[str] = []
    for key in section_order:
        sec = sections.get(key)
        if not isinstance(sec, dict):
            continue
        title = sec.get("title")
        text = _strip_html(sec.get("text") or "")
        if title and text:
            pieces.append(f"{title}\n{text}")
        elif text:
            pieces.append(text)
    return "\n\n".join(pieces)


def _fetch_json(url: str, timeout: float = 20.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class SmartRecruitersSource:
    """Fetch normalized jobs from SmartRecruiters public postings."""

    name = "smartrecruiters"

    def fetch(self, identifiers: Iterable[str]) -> list[NormalizedJob]:
        out: list[NormalizedJob] = []
        for company in identifiers:
            company = (company or "").strip()
            if not company:
                continue
            try:
                listing = _fetch_json(
                    f"https://api.smartrecruiters.com/v1/companies/{company}/postings?limit=100"
                )
            except urllib.error.HTTPError as e:
                raise RuntimeError(
                    f"SmartRecruiters company '{company}' fetch failed: HTTP {e.code}"
                ) from e
            except urllib.error.URLError as e:
                raise RuntimeError(
                    f"SmartRecruiters company '{company}' fetch failed: {e.reason}"
                ) from e

            postings = (listing or {}).get("content") or []
            for i, post in enumerate(postings):
                fetch_detail = i < _MAX_DETAIL_FETCHES
                out.append(self._normalize(company, post, fetch_detail))
        return out

    def _normalize(
        self, company: str, raw: dict[str, Any], fetch_detail: bool
    ) -> NormalizedJob:
        title = raw.get("name") or ""
        posting_id = str(raw.get("id") or "")
        ref_number = raw.get("refNumber")

        # Detail fetch — only when within budget. Failures are non-fatal:
        # we still emit the row with whatever the list endpoint gave us.
        description = ""
        if fetch_detail and posting_id:
            try:
                detail = _fetch_json(
                    f"https://api.smartrecruiters.com/v1/companies/{company}/postings/{posting_id}"
                )
                description = _extract_description(detail) if isinstance(detail, dict) else ""
            except (urllib.error.HTTPError, urllib.error.URLError):
                description = ""
        description = _WHITESPACE_RE.sub(" ", description or "").strip()

        location_raw = raw.get("location")
        location_str = _format_location(location_raw)
        remote_type = _detect_remote(
            location_raw if isinstance(location_raw, dict) else None,
            description,
        )

        company_block = raw.get("company") if isinstance(raw.get("company"), dict) else {}
        company_name = company_block.get("name") or company

        url = raw.get("applyUrl") or raw.get("ref") or f"https://jobs.smartrecruiters.com/{company}/{posting_id}"
        posted_at = raw.get("releasedDate") or raw.get("createdOn")

        from ..match_v2 import extract_skills as _extract
        skills = _extract(f"{title}\n{description}")

        # Department + industry as soft tags; mirror Lever/Ashby conventions.
        dept = raw.get("department")
        if isinstance(dept, dict):
            dept = dept.get("label")
        industry = raw.get("industry")
        if isinstance(industry, dict):
            industry = industry.get("label")
        tags = [t for t in (dept, industry) if isinstance(t, str)]

        external_id = posting_id or (ref_number or url)

        return NormalizedJob(
            source=self.name,
            external_id=str(external_id),
            title=title,
            company=company_name,
            url=url,
            description=description[:10_000],  # cap
            location=location_str or None,
            remote_type=remote_type,
            skills=skills,
            tags=tags,
            posted_at=posted_at,
        )


register_source("smartrecruiters", lambda: SmartRecruitersSource())
