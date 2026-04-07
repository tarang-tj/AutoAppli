"""Normalize model output and user-facing resume plain text."""

from __future__ import annotations

import json
import re


def sanitize_tailored_resume_text(raw: str) -> str:
    """
    Strip accidental markdown fences and common preamble so PDF/layout parsers
    see plain resume lines (name, contact, sections, bullets).
    """
    s = (raw or "").strip()
    if not s:
        return s

    # Whole string wrapped in one fenced block
    whole = re.match(r"^```(?:[\w+-]*)?\s*\r?\n([\s\S]*?)\r?\n```\s*$", s)
    if whole:
        s = whole.group(1).strip()
    else:
        s = re.sub(r"^```(?:[\w+-]*)?\s*\r?\n?", "", s)
        s = re.sub(r"\r?\n```\s*$", "", s).strip()

    # Remove lightweight markdown so PDF / plain layout stay clean
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"\1", s)

    lower = s.lower()
    for prefix in (
        "here is the tailored resume:",
        "here's the tailored resume:",
        "here is your tailored resume:",
        "here's your tailored resume:",
        "tailored resume:",
    ):
        if lower.startswith(prefix):
            s = s[len(prefix) :].lstrip(" \t\n:/-—•")
            lower = s.lower()
            break

    return s.strip()


def parse_resume_review_json(text: str) -> dict:
    """Extract a JSON object from Claude output (optional markdown fence)."""
    s = (text or "").strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", s, re.IGNORECASE)
    if m:
        s = m.group(1).strip()
    else:
        l = s.find("{")
        r = s.rfind("}")
        if l != -1 and r != -1 and r > l:
            s = s[l : r + 1]
    data = json.loads(s)
    if not isinstance(data, dict):
        raise ValueError("Review response must be a JSON object")
    return data
