"""
Lever public job-board ingestion.

Lever exposes every customer's board as a public JSON feed at:
    https://api.lever.co/v0/postings/{site}?mode=json

No auth required for public boards. We fetch, normalize, and return a list
of `NormalizedJob` records.

Site identifiers are the short company slugs you see in Lever URLs:
    https://jobs.lever.co/netflix     → site = "netflix"
    https://jobs.lever.co/figma       → site = "figma"

Known behaviour:
    - Each posting has `id` (UUID-ish), `text` (title), `hostedUrl`, and
      either `description` (HTML) or `descriptionPlain` (text).
    - `categories.location` is a single string; `categories.allLocations`
      is a list when a role spans multiple offices / remote.
    - `workplaceType` may be "remote" | "hybrid" | "onsite" on newer postings;
      when absent we fall back to keyword-sniffing the location + description.
    - `createdAt` is a millisecond timestamp.
"""
from __future__ import annotations

import datetime as _dt
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


def _detect_remote(location: str, description: str, workplace_type: Optional[str]) -> Optional[str]:
    if workplace_type:
        wt = workplace_type.lower().strip()
        if wt in ("remote", "hybrid", "onsite", "on-site", "in-office"):
            return "onsite" if wt in ("on-site", "in-office") else wt
    low = f"{location} {description}".lower()
    if "hybrid" in low:
        return "hybrid"
    if re.search(r"\bremote\b", low) and "on-site" not in low and "onsite" not in low:
        return "remote"
    if re.search(r"\b(on-?site|in-?office)\b", low):
        return "onsite"
    return None


def _ms_to_iso(ms: Any) -> Optional[str]:
    if not isinstance(ms, (int, float)):
        return None
    try:
        return _dt.datetime.fromtimestamp(ms / 1000, tz=_dt.timezone.utc).isoformat()
    except (OverflowError, OSError, ValueError):
        return None


def _fetch_json(url: str, timeout: float = 20.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


class LeverSource:
    """Fetch normalized jobs from Lever public job boards."""

    name = "lever"

    def fetch(self, identifiers: Iterable[str]) -> list[NormalizedJob]:
        out: list[NormalizedJob] = []
        for site in identifiers:
            site = (site or "").strip()
            if not site:
                continue
            try:
                payload = _fetch_json(
                    f"https://api.lever.co/v0/postings/{site}?mode=json"
                )
            except urllib.error.HTTPError as e:
                raise RuntimeError(f"Lever site '{site}' fetch failed: HTTP {e.code}") from e
            except urllib.error.URLError as e:
                raise RuntimeError(f"Lever site '{site}' fetch failed: {e.reason}") from e

            # Lever returns a top-level list of postings.
            postings = payload if isinstance(payload, list) else payload.get("postings") or []
            for job in postings:
                out.append(self._normalize(site, job))
        return out

    def _normalize(self, site: str, raw: dict[str, Any]) -> NormalizedJob:
        title = raw.get("text") or raw.get("title") or ""
        cats = raw.get("categories") or {}

        location = cats.get("location") or ""
        if not location:
            all_locs = cats.get("allLocations")
            if isinstance(all_locs, list) and all_locs:
                location = ", ".join(str(x) for x in all_locs[:3])

        desc_plain = raw.get("descriptionPlain")
        if not desc_plain:
            desc_plain = _strip_html(raw.get("description") or "")

        # Pull in list sections ("Requirements", "What you'll do", …) for
        # richer skill extraction.
        for section in raw.get("lists") or []:
            content = section.get("contentPlain") or _strip_html(section.get("content") or "")
            if content:
                desc_plain = f"{desc_plain}\n\n{content}"
        additional = raw.get("additionalPlain") or _strip_html(raw.get("additional") or "")
        if additional:
            desc_plain = f"{desc_plain}\n\n{additional}"

        description = _WHITESPACE_RE.sub(" ", desc_plain or "").strip()

        url = raw.get("hostedUrl") or raw.get("applyUrl") or f"https://jobs.lever.co/{site}/{raw.get('id', '')}"
        workplace_type = raw.get("workplaceType")
        remote_type = _detect_remote(location, description, workplace_type)

        posted_at = _ms_to_iso(raw.get("createdAt"))

        # Extract skills from title+description via the shared taxonomy.
        from ..match_v2 import extract_skills as _extract
        skills = _extract(f"{title}\n{description}")

        tags = [t for t in (cats.get("team"), cats.get("department"), cats.get("commitment")) if t]

        return NormalizedJob(
            source=self.name,
            external_id=str(raw.get("id") or url),
            title=title,
            company=site,  # Lever doesn't expose a display-name reliably
            url=url,
            description=description[:10_000],  # cap
            location=location or None,
            remote_type=remote_type,
            skills=skills,
            tags=tags,
            posted_at=posted_at,
        )


register_source("lever", lambda: LeverSource())
