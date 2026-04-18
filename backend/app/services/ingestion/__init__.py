"""Pluggable job-ingestion sources.

Each source implements the `JobSource` protocol (see `base.py`) and returns a
list of `NormalizedJob` records. The CLI in `backend/scripts/ingest.py` wires
these into Supabase (or stdout during dry-run).

Source registration is side-effectful: importing a module here triggers a
`register_source(name, factory)` call at the bottom of that module. Add new
sources by importing them below.
"""
from .base import JobSource, NormalizedJob, list_sources, register_source
from .greenhouse import GreenhouseSource
from .lever import LeverSource
from .ashby import AshbySource

__all__ = [
    "JobSource",
    "NormalizedJob",
    "GreenhouseSource",
    "LeverSource",
    "AshbySource",
    "list_sources",
    "register_source",
]
