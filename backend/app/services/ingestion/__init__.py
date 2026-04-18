"""Pluggable job-ingestion sources.

Each source implements the `JobSource` protocol (see `base.py`) and returns a
list of `NormalizedJob` records. The CLI in `backend/scripts/ingest.py` wires
these into Supabase (or stdout during dry-run).
"""
from .base import JobSource, NormalizedJob, list_sources, register_source
from .greenhouse import GreenhouseSource

__all__ = [
    "JobSource",
    "NormalizedJob",
    "GreenhouseSource",
    "list_sources",
    "register_source",
]
