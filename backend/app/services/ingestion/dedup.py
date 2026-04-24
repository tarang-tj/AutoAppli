"""
Cross-source deduplication helpers (PR 2 — shadow-write).

PR 2 ships:
  • compute_posting_key — hashes pre-normalized fields off NormalizedJob
    (location_country / region / city / is_remote, company_normalized,
    plus normalize_title from normalizers.py).
  • canonical_url — strips tracking params for the URL fingerprint
    audit recorded in cached_jobs_sightings.
  • raw_hash — sha1 over the stable payload, for PR 3's "skip merge if
    nothing changed" short-circuit.

Merge / collapse logic is intentionally absent here — that lives in
PR 3's `merge.py`. PR 2 only writes audit data.
"""
from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from .normalizers import normalize_title

if TYPE_CHECKING:
    from .base import NormalizedJob


# ASCII unit separator — safe across every title/company/location character
# set we've seen, so no need to escape input before joining.
_KEY_SEP = "\x1f"


# Tracking / routing query params we drop from canonical URLs so two
# sources forwarding the same posting with different tracking tails still
# match. Conservative: only params that never carry content.
_TRACKING_PARAMS = frozenset({
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "gh_src",
    "gh_jid",
    "gh_gdc",
    "ref",
    "ref_src",
    "source",
    "mc_cid",
    "mc_eid",
    "fbclid",
    "gclid",
    "msclkid",
    "yclid",
    "igshid",
})


def canonical_url(url: str | None) -> str:
    """Return a stable canonical form of a job URL.

    Strips tracking params, lowercases host, drops `www.`, drops fragment,
    strips trailing slash. Idempotent.

    Non-HTTP URLs or parse failures pass through lowercased.
    """
    if not url:
        return ""
    raw = url.strip()
    if not raw:
        return ""
    try:
        parsed = urlparse(raw)
    except ValueError:
        return raw.lower()

    scheme = (parsed.scheme or "https").lower()
    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    netloc = host
    if parsed.port and not (
        (scheme == "http" and parsed.port == 80)
        or (scheme == "https" and parsed.port == 443)
    ):
        netloc = f"{host}:{parsed.port}"

    kept_qs = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=False)
        if k.lower() not in _TRACKING_PARAMS
    ]
    cleaned = parsed._replace(
        scheme=scheme,
        netloc=netloc,
        query=urlencode(kept_qs, doseq=True),
        fragment="",
    )
    out = urlunparse(cleaned)
    if out.endswith("/") and not out.endswith("://") and out.count("/") > 3:
        out = out[:-1]
    return out


def _location_key_part(job: "NormalizedJob") -> str:
    """Build the location component of the posting_key.

    Reads the four pre-normalized fields PR 1 populates on NormalizedJob:
        location_country (ISO alpha-2)
        location_region  (state/province code)
        location_city
        location_is_remote (bool)

    Order matters: country/region/city assembled into a slug. Remote-true
    collapses to the literal "remote" so two sources reporting the same
    posting at different locations both get bucketed as remote.
    """
    if job.location_is_remote:
        return "remote"
    parts: list[str] = []
    if job.location_country:
        parts.append(job.location_country.lower())
    if job.location_region:
        parts.append(job.location_region.lower())
    if job.location_city:
        # City may be multi-word — collapse to a stable slug.
        slug = job.location_city.lower()
        slug = "".join(c if c.isalnum() else "-" for c in slug)
        slug = "-".join(p for p in slug.split("-") if p)
        parts.append(slug)
    if not parts:
        return "unknown"
    return "/".join(parts)


def compute_posting_key(job: "NormalizedJob") -> str:
    """Return the cross-source posting_key (hex sha256, 64 chars).

    Reads PR 1's pre-normalized fields off `job` rather than re-normalizing.
    The title is normalized at hash time via PR 1's normalize_title (added
    in PR 2). Two NormalizedJobs whose normalized fields agree produce the
    same key, regardless of source or external_id.

    Field choices (see PR 2 design §5.2):
        company_normalized  — already canonical from PR 1
        title (normalized)  — normalize_title(job.title)
        location parts      — country/region/city or "remote"

    Excluded: salary (too sparse), posted_at (varies across sources for
    the same role), employment_type (not in schema).
    """
    parts = (
        (job.company_normalized or "").lower(),
        normalize_title(job.title),
        _location_key_part(job),
    )
    raw = _KEY_SEP.join(parts).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def raw_hash(job: "NormalizedJob") -> str:
    """Return a sha1 over the job's stable payload.

    PR 3's merge logic uses this to short-circuit re-runs: if a sighting's
    raw_hash hasn't changed since the last ingest, there's no point
    re-running the field-level merge.

    Includes the pre-normalized fields PR 1 populates so any normalizer
    upgrade that changes their values bumps the hash automatically.
    """
    payload = {
        "source": job.source,
        "external_id": job.external_id,
        "title": job.title or "",
        "company": job.company or "",
        "company_normalized": job.company_normalized or "",
        "url": canonical_url(job.url),
        "description": job.description or "",
        "location": job.location or "",
        "location_city": job.location_city or "",
        "location_region": job.location_region or "",
        "location_country": job.location_country or "",
        "location_is_remote": bool(job.location_is_remote),
        "remote_type": job.remote_type or "",
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "skills": sorted(job.skills or []),
        "tags": sorted(job.tags or []),
        "posted_at": job.posted_at or "",
        "normalized_version": int(job.normalized_version or 0),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha1(encoded).hexdigest()
