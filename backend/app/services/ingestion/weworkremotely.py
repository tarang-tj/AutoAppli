"""
WeWorkRemotely RSS-based job ingestion.

Unlike Greenhouse / Lever / Ashby / Workable / SmartRecruiters — all of which
are ATS providers whose "identifiers" are company slugs — WeWorkRemotely is
an aggregator. There's no per-company board. Instead, jobs are organized by
*category*, each with its own public RSS feed:

    https://weworkremotely.com/categories/{slug}.rss

Common category slugs:
    remote-programming-jobs
    remote-full-stack-programming-jobs
    remote-back-end-programming-jobs
    remote-front-end-programming-jobs
    remote-devops-sysadmin-jobs
    remote-design-jobs
    remote-product-jobs
    remote-customer-support-jobs
    remote-sales-and-marketing-jobs
    remote-management-and-finance-jobs
    all-other-remote-jobs

Identifiers passed to `fetch(...)` are these category slugs.

Known behaviour:
    - Each RSS `<item>` has title (format: "Company: Role"), description
      (HTML), link, pubDate, and a `<guid>`.
    - The title separator is consistently ": " — we split on the first one.
    - All WWR jobs are remote-only by definition, so we set `remote_type`
      to "remote" unconditionally.
    - The RSS feed includes a `<region>` tag on newer postings but it's
      inconsistently populated, so we fall back to parsing it out of the
      description ("Region: ..." lines sometimes appear) or leave null.
"""
from __future__ import annotations

import datetime as _dt
import email.utils
import html
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from typing import Iterable, Optional

from .base import JobSource, NormalizedJob, register_source


_USER_AGENT = "AutoAppli/1.0 (+https://github.com/tarang-tj/AutoAppli)"
_TAG_STRIP_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")
_REGION_LINE_RE = re.compile(r"(?:^|\n)\s*Region\s*:\s*(.+?)(?:\n|$)", re.IGNORECASE)


def _strip_html(raw: str) -> str:
    if not raw:
        return ""
    text = _TAG_STRIP_RE.sub(" ", raw)
    text = html.unescape(text)
    return _WHITESPACE_RE.sub(" ", text).strip()


def _parse_rfc2822(date_str: str) -> Optional[str]:
    """Convert an RFC-2822 pubDate string into ISO-8601, or None on parse failure."""
    if not date_str:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(date_str)
    except (TypeError, ValueError):
        return None
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=_dt.timezone.utc)
    return parsed.isoformat()


def _split_title(raw: str) -> tuple[str, str]:
    """
    Split a WWR title like "Acme Corp: Senior Backend Engineer" into
    (company, title). Falls back to ("", raw) if no separator is found.
    """
    if not raw:
        return ("", "")
    # WWR uses ": " but some listings slip in a plain ":" or dash. Prefer
    # the first ": " if present, else first ":" fallback.
    for sep in (": ", " - ", ":", " | "):
        idx = raw.find(sep)
        if idx > 0:
            company = raw[:idx].strip()
            title = raw[idx + len(sep):].strip()
            if company and title:
                return (company, title)
    return ("", raw.strip())


def _extract_region(description: str) -> Optional[str]:
    match = _REGION_LINE_RE.search(description)
    if match:
        region = match.group(1).strip()
        if region and len(region) < 120:
            return region
    return None


def _fetch_bytes(url: str, timeout: float = 20.0) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


class WeWorkRemotelySource:
    """Fetch normalized jobs from WeWorkRemotely per-category RSS feeds."""

    name = "weworkremotely"

    def fetch(self, identifiers: Iterable[str]) -> list[NormalizedJob]:
        out: list[NormalizedJob] = []
        for slug in identifiers:
            slug = (slug or "").strip()
            if not slug:
                continue
            url = f"https://weworkremotely.com/categories/{slug}.rss"
            try:
                body = _fetch_bytes(url)
            except urllib.error.HTTPError as e:
                raise RuntimeError(
                    f"WeWorkRemotely category '{slug}' fetch failed: HTTP {e.code}"
                ) from e
            except urllib.error.URLError as e:
                raise RuntimeError(
                    f"WeWorkRemotely category '{slug}' fetch failed: {e.reason}"
                ) from e

            try:
                root = ET.fromstring(body)
            except ET.ParseError as e:
                raise RuntimeError(
                    f"WeWorkRemotely category '{slug}' returned invalid XML: {e}"
                ) from e

            # RSS 2.0: items live under rss/channel/item.
            channel = root.find("channel")
            items = channel.findall("item") if channel is not None else []
            for item in items:
                normalized = self._normalize(slug, item)
                if normalized is not None:
                    out.append(normalized)
        return out

    def _normalize(self, category: str, item: ET.Element) -> Optional[NormalizedJob]:
        def _text(tag: str) -> str:
            el = item.find(tag)
            return (el.text or "").strip() if el is not None and el.text else ""

        raw_title = _text("title")
        company, title = _split_title(raw_title)
        if not title:
            return None  # malformed item — skip silently

        link = _text("link")
        if not link:
            return None

        description_html = _text("description")
        description = _strip_html(description_html)
        posted_at = _parse_rfc2822(_text("pubDate"))

        region = _text("region") or _extract_region(description)
        location = region or "Remote"

        guid = _text("guid") or link
        external_id = guid

        from ..match_v2 import extract_skills as _extract
        skills = _extract(f"{title}\n{description}")

        # WWR category slug → a cleaner display tag. Strip the "remote-"
        # prefix and the "-jobs" suffix so "remote-programming-jobs" becomes
        # "programming".
        pretty_category = category
        if pretty_category.startswith("remote-"):
            pretty_category = pretty_category[len("remote-"):]
        if pretty_category.endswith("-jobs"):
            pretty_category = pretty_category[: -len("-jobs")]
        tags = [pretty_category.replace("-", " ")] if pretty_category else []

        return NormalizedJob(
            source=self.name,
            external_id=external_id,
            title=title,
            company=company or "Unknown",
            url=link,
            description=description[:10_000],  # cap
            location=location,
            remote_type="remote",  # WWR is remote-only by definition
            skills=skills,
            tags=tags,
            posted_at=posted_at,
        )


register_source("weworkremotely", lambda: WeWorkRemotelySource())
