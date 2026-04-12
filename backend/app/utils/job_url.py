"""Normalize job listing URLs for storage and links."""

from __future__ import annotations

import re


def normalize_job_url(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    if re.match(r"^https?://", s, re.I):
        return s
    if s.startswith("//"):
        return f"https:{s}"
    if re.match(r"^[a-z][a-z0-9+.-]*://", s, re.I):
        return s
    if re.match(r"^(mailto|tel|sms):", s, re.I):
        return s
    return f"https://{s}"
