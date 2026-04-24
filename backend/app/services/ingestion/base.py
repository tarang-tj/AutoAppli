"""
Base abstractions for job ingestion sources.

A `JobSource` knows how to fetch one or more companies' job postings from an
external provider (Greenhouse, Lever, Ashby, …) and normalize them to a
`NormalizedJob` that matches the Supabase `jobs` table's expected columns.

Adding a source:
    1. Subclass `JobSource`
    2. Implement `fetch(company_ids)` → list[NormalizedJob]
    3. Register it at import time with `register_source("greenhouse", MyCls)`
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field, asdict
from typing import Callable, Iterable, Optional, Protocol

from .normalizers import (
    NORMALIZER_VERSION,
    normalize_company,
    normalize_location,
    should_mark_remote,
)


@dataclass
class NormalizedJob:
    """Normalized job record ready to upsert into Supabase `jobs` table."""
    source: str
    external_id: str
    title: str
    company: str
    url: str
    description: str = ""
    location: Optional[str] = None
    remote_type: Optional[str] = None  # "remote" | "hybrid" | "onsite"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    skills: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    posted_at: Optional[str] = None  # ISO8601

    # Normalized fields — populated automatically in __post_init__ by the
    # ingest-time normalizer. Parsers don't need to touch these; they flow
    # through from `location`, `company`, and `remote_type`.
    #
    # If a caller (tests, future callers that already have canonical values)
    # wants to pre-seed these, they can. __post_init__ only computes the
    # value when the field is still at its default.
    location_city: Optional[str] = None
    location_region: Optional[str] = None
    location_country: Optional[str] = None
    location_is_remote: bool = False
    company_normalized: Optional[str] = None
    normalized_version: int = 0

    def __post_init__(self) -> None:
        # Company canonicalization — only run if not pre-seeded.
        if self.company_normalized is None:
            self.company_normalized = normalize_company(self.company, self.source)

        # Location parsing — three-field tuple either all caller-set or all
        # derived. Using `any()` means a caller who pre-seeds even one field
        # takes ownership of the entire location parse. The is_remote bool
        # still gets reconciled against remote_type below.
        caller_set_location = any(
            [self.location_city, self.location_region, self.location_country]
        )
        if not caller_set_location:
            norm = normalize_location(self.location, self.source)
            self.location_city = norm.city
            self.location_region = norm.region
            self.location_country = norm.country
            # Merge remote_type (from JD scan) with location-derived is_remote.
            self.location_is_remote = should_mark_remote(
                self.remote_type, norm.is_remote
            )
        else:
            # Caller gave us canonical location fields; still reconcile
            # is_remote using whatever location_is_remote they passed.
            self.location_is_remote = should_mark_remote(
                self.remote_type, self.location_is_remote
            )

        # Always stamp with the current normalizer version so downstream
        # backfills can detect out-of-date rows.
        if not self.normalized_version:
            self.normalized_version = NORMALIZER_VERSION

    @property
    def canonical_id(self) -> str:
        """Deterministic ID for deduping across runs — source+external_id."""
        raw = f"{self.source}:{self.external_id}".encode("utf-8")
        return hashlib.sha1(raw).hexdigest()[:16]

    def to_row(self) -> dict:
        """Convert to a dict suitable for `supabase.from_('jobs').upsert()`."""
        return asdict(self)


class JobSource(Protocol):
    """Protocol every source implements."""

    name: str

    def fetch(self, identifiers: Iterable[str]) -> list[NormalizedJob]:
        """Fetch and normalize postings for the given company/board identifiers."""
        ...


_REGISTRY: dict[str, Callable[[], JobSource]] = {}


def register_source(name: str, factory: Callable[[], JobSource]) -> None:
    """Register a source constructor at import time."""
    _REGISTRY[name] = factory


def list_sources() -> dict[str, Callable[[], JobSource]]:
    return dict(_REGISTRY)


def dedupe_jobs(jobs: Iterable[NormalizedJob]) -> list[NormalizedJob]:
    """Collapse duplicates by canonical_id. First occurrence wins."""
    seen: set[str] = set()
    out: list[NormalizedJob] = []
    for j in jobs:
        cid = j.canonical_id
        if cid in seen:
            continue
        seen.add(cid)
        out.append(j)
    return out
