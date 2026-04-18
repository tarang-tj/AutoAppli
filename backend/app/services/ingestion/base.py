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
