"""
Workable public job-board ingestion.

Workable exposes each customer's job board as a public JSON widget feed at:
    https://apply.workable.com/api/v1/widget/accounts/{subdomain}

No auth is required for public boards. We fetch, normalize, and return a
list of `NormalizedJob` records.

Board identifiers are the Workable subdomains:
    https://apply.workable.com/autoappli   → subdomain = "autoappli"
    https://apply.workable.com/remote      → subdomain = "remote"

Known behaviour:
    - The widget endpoint returns `{"accounts": [{...}], "jobs": [...]}`.
    - Each job has `id` (int), `shortcode` (slug), `title`, `description`
      (HTML), `requirements` (HTML, optional), `benefits` (HTML, optional),
      `location` ({"city", "region", "country", "country_code"}), `remote`
      (bool), `employment_type`, `department`, `published_on` (ISO date),
      and `shortlink` (public apply URL).
    - Sibling fields `description_html` / `description_text` show up on
      some tenants instead of `description`; we handle both.
    - `remote` is authoritative when true; Workable doesn't distinguish
      hybrid at the API level so we fall back to keyword sniffing.
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
    is_remote: Any, location: str, description: str
) -> Optional[str]:
    if is_remote is True:
        return "remote"
    low = f"{location} {description}".lower()
    if "hybrid" in low:
        return "hybrid"
    if re.search(r"\bremote\b", low) and "on-site" not in low and "onsite" not in low:
        return "remote"
    if re.search(r"\b(on-?site|in-?office)\b", low):
        return "onsite"
    return None


def _format_location(loc: Any) -> str:
    """Workable locations are an object — flatten to a display string."""
    if not isinstance(loc, dict):
        return str(loc or "")
    parts = []
    city = loc.get("city")
    region = loc.get("region")
    country = loc.get("country")
    for p in (city, region, country):
        if p and p not in parts:
            parts.append(p)
    return ", ".join(parts)


def _fetch_json(url: str, timeout: float = 20.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class WorkableSource:
    """Fetch normalized jobs from Workable public job boards."""

    name = "workable"

    def fetch(self, identifiers: Iterable[str]) -> list[NormalizedJob]:
        out: list[NormalizedJob] = []
        for subdomain in identifiers:
            subdomain = (subdomain or "").strip()
            if not subdomain:
                continue
            try:
                payload = _fetch_json(
                    f"https://apply.workable.com/api/v1/widget/accounts/{subdomain}"
                )
            except urllib.error.HTTPError as e:
                raise RuntimeError(
                    f"Workable account '{subdomain}' fetch failed: HTTP {e.code}"
                ) from e
            except urllib.error.URLError as e:
                raise RuntimeError(
                    f"Workable account '{subdomain}' fetch failed: {e.reason}"
                ) from e

            # Resolve the company display name from the `accounts` block
            # if present, else fall back to the subdomain.
            company_name = subdomain
            accounts = payload.get("accounts") if isinstance(payload, dict) else None
            if isinstance(accounts, list) and accounts:
                first = accounts[0]
                if isinstance(first, dict):
                    company_name = first.get("name") or company_name

            jobs = (payload or {}).get("jobs") or []
            for job in jobs:
                out.append(self._normalize(subdomain, company_name, job))
        return out

    def _normalize(
        self, subdomain: str, company_name: str, raw: dict[str, Any]
    ) -> NormalizedJob:
        title = raw.get("title") or ""

        # Description — accept either plain text, HTML, or the split
        # description/requirements/benefits trio that older tenants return.
        desc_plain = raw.get("description_text")
        if not desc_plain:
            pieces: list[str] = []
            for key in ("description", "description_html", "requirements", "benefits"):
                value = raw.get(key)
                if value:
                    pieces.append(_strip_html(value))
            desc_plain = "\n\n".join(p for p in pieces if p)
        description = _WHITESPACE_RE.sub(" ", desc_plain or "").strip()

        location = _format_location(raw.get("location"))
        is_remote = raw.get("remote")
        remote_type = _detect_remote(is_remote, location, description)

        shortcode = raw.get("shortcode") or raw.get("id") or ""
        url = (
            raw.get("shortlink")
            or raw.get("url")
            or f"https://apply.workable.com/{subdomain}/j/{shortcode}"
        )
        external_id = str(raw.get("id") or shortcode or url)

        posted_at = raw.get("published_on") or raw.get("created_at")

        # Extract skills from title+description via the shared taxonomy.
        from ..match_v2 import extract_skills as _extract
        skills = _extract(f"{title}\n{description}")

        tags = [
            t
            for t in (
                raw.get("department"),
                raw.get("employment_type"),
                raw.get("experience"),
            )
            if t and isinstance(t, str)
        ]

        return NormalizedJob(
            source=self.name,
            external_id=external_id,
            title=title,
            company=company_name,
            url=url,
            description=description[:10_000],  # cap
            location=location or None,
            remote_type=remote_type,
            skills=skills,
            tags=tags,
            posted_at=posted_at,
        )


register_source("workable", lambda: WorkableSource())
