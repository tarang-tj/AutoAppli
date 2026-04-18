"""
Greenhouse public job-board ingestion.

Greenhouse exposes every customer's board at:
    https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true

No auth required for public boards. We fetch, normalize, and return a list
of `NormalizedJob` records.

Board tokens are the short company identifiers you see in Greenhouse URLs:
    https://boards.greenhouse.io/airbnb  → token = "airbnb"
    https://boards.greenhouse.io/stripe  → token = "stripe"

Known behaviour:
    - `content=true` inlines the HTML description; we strip tags for matching.
    - Jobs have an internal `id` (numeric) and `absolute_url` (link to the
      apply page). We use `id` as the `external_id`.
    - Locations are a single string like "San Francisco, CA" or "Remote".
"""
from __future__ import annotations

import html
import json
import re
import urllib.error
import urllib.request
from typing import Any, Iterable, Optional

from ..taxonomy import normalize_skill_list
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


def _detect_remote(location: str, description: str) -> Optional[str]:
    low = f"{location} {description}".lower()
    if "hybrid" in low:
        return "hybrid"
    if re.search(r"\bremote\b", low) and "on-site" not in low and "onsite" not in low:
        return "remote"
    if re.search(r"\b(on-?site|in-?office)\b", low):
        return "onsite"
    return None


def _fetch_json(url: str, timeout: float = 20.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class GreenhouseSource:
    name = "greenhouse"

    def fetch(self, identifiers: Iterable[str]) -> list[NormalizedJob]:
        out: list[NormalizedJob] = []
        for token in identifiers:
            token = (token or "").strip()
            if not token:
                continue
            try:
                payload = _fetch_json(
                    f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
                )
            except urllib.error.HTTPError as e:
                raise RuntimeError(f"Greenhouse board '{token}' fetch failed: HTTP {e.code}") from e
            except urllib.error.URLError as e:
                raise RuntimeError(f"Greenhouse board '{token}' fetch failed: {e.reason}") from e

            jobs = payload.get("jobs") or []
            for job in jobs:
                out.append(self._normalize(token, job))
        return out

    def _normalize(self, token: str, raw: dict[str, Any]) -> NormalizedJob:
        title = raw.get("title") or ""
        desc_html = raw.get("content") or ""
        description = _strip_html(desc_html)
        location = ((raw.get("location") or {}).get("name")) or ""
        url = raw.get("absolute_url") or f"https://boards.greenhouse.io/{token}/jobs/{raw.get('id', '')}"
        posted_at = raw.get("updated_at") or raw.get("first_published")

        # Extract skills from description (and, if present, any structured
        # metadata fields Greenhouse sometimes includes).
        metadata_skills: list[str] = []
        for md in raw.get("metadata") or []:
            val = md.get("value")
            if isinstance(val, str):
                metadata_skills.append(val)
            elif isinstance(val, list):
                metadata_skills.extend([v for v in val if isinstance(v, str)])

        # Skills pulled from the taxonomy on description; normalize metadata
        from .base import NormalizedJob  # local import avoids cycle
        from ..match_v2 import extract_skills as _extract

        extracted = _extract(f"{title}\n{description}")
        normalized_meta = normalize_skill_list(metadata_skills)
        merged_skills: list[str] = []
        seen: set[str] = set()
        for s in extracted + normalized_meta:
            if s not in seen:
                seen.add(s)
                merged_skills.append(s)

        remote_type = _detect_remote(location, description)

        return NormalizedJob(
            source=self.name,
            external_id=str(raw.get("id") or url),
            title=title,
            company=raw.get("company_name") or token,
            url=url,
            description=description[:10_000],  # cap
            location=location or None,
            remote_type=remote_type,
            skills=merged_skills,
            tags=[],
            posted_at=posted_at,
        )


register_source("greenhouse", lambda: GreenhouseSource())
