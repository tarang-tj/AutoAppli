"""iCal (RFC 5545) serialization for AutoAppli job deadlines.

Pure-Python, zero dependencies. We hand-roll RFC 5545 because the spec is
straightforward for our needs (all-day VEVENTs with a handful of fields)
and adding the `icalendar` package isn't worth it.

Public surface:
    build_deadlines_ical(jobs, calendar_name="...", now=None) -> str

Inputs are plain dicts (the same shape the jobs repository returns).
We accept either ``closing_date`` or ``deadline`` for the deadline field
because the backend schema uses ``deadline`` while the product spec
called the column ``closing_date``.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable

CRLF = "\r\n"
PRODID = "-//AutoAppli//Deadline Export//EN"
DEFAULT_CALENDAR_NAME = "AutoAppli — Deadlines"
UID_DOMAIN = "autoappli.app"
DESCRIPTION_LIMIT = 500


# ── Field-level helpers ─────────────────────────────────────────────────────


def _escape_text(value: str) -> str:
    """Escape per RFC 5545 §3.3.11 for TEXT-typed property values.

    Order matters: backslash first, otherwise we'd double-escape the
    backslashes we just inserted.
    """
    if value is None:
        return ""
    out = str(value)
    out = out.replace("\\", "\\\\")
    out = out.replace(";", "\\;")
    out = out.replace(",", "\\,")
    out = out.replace("\r\n", "\n").replace("\r", "\n")
    out = out.replace("\n", "\\n")
    return out


def _fold_line(line: str, octet_limit: int = 75) -> str:
    """Fold a single content line per RFC 5545 §3.1.

    Lines longer than ``octet_limit`` octets (UTF-8 bytes) are split with
    CRLF + a single space continuation. We split on octet boundaries that
    don't break a multi-byte UTF-8 sequence.
    """
    encoded = line.encode("utf-8")
    if len(encoded) <= octet_limit:
        return line

    chunks: list[bytes] = []
    start = 0
    # First chunk gets the full octet_limit; subsequent chunks reserve 1
    # octet for the leading space, so they take octet_limit - 1.
    first = True
    while start < len(encoded):
        limit = octet_limit if first else octet_limit - 1
        end = min(start + limit, len(encoded))
        # Don't split inside a UTF-8 multi-byte sequence: a continuation
        # byte starts with 10xxxxxx (0x80–0xBF). Walk back if needed.
        while end < len(encoded) and (encoded[end] & 0xC0) == 0x80:
            end -= 1
        chunks.append(encoded[start:end])
        start = end
        first = False

    decoded = [chunks[0].decode("utf-8")]
    for c in chunks[1:]:
        decoded.append(" " + c.decode("utf-8"))
    return CRLF.join(decoded)


def _utc_stamp(dt: datetime) -> str:
    """Format a UTC datetime as YYYYMMDDTHHMMSSZ (RFC 5545 §3.3.5)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y%m%dT%H%M%SZ")


def _date_stamp(d: date) -> str:
    """Format a date as YYYYMMDD (RFC 5545 §3.3.4 — DATE value type)."""
    return d.strftime("%Y%m%d")


def _coerce_date(value: Any) -> date | None:
    """Best-effort conversion of a job's deadline field to a ``date``.

    Accepts:
      - ``date`` / ``datetime`` instances
      - ISO 8601 strings (``YYYY-MM-DD`` or full timestamps with offset/Z)

    Returns ``None`` for missing or unparsable values — the caller will
    skip the job silently.
    """
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        # Plain YYYY-MM-DD short-circuit
        try:
            return date.fromisoformat(s)
        except ValueError:
            pass
        # Full timestamp — accept trailing Z by translating to +00:00
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            return dt.date()
        except ValueError:
            return None
    return None


def _job_deadline(job: dict) -> date | None:
    """Pull the deadline date from whichever key the job dict uses."""
    return _coerce_date(job.get("closing_date") or job.get("deadline"))


def _truncate_description(text: str | None, limit: int = DESCRIPTION_LIMIT) -> str:
    if not text:
        return ""
    s = str(text).strip()
    if len(s) <= limit:
        return s
    return s[:limit].rstrip() + "…"


# ── Calendar / event builders ───────────────────────────────────────────────


def _emit(props: list[str], name: str, value: str) -> None:
    """Append a folded property line to ``props``."""
    props.append(_fold_line(f"{name}:{value}"))


def _build_event(job: dict, dtstamp: str) -> list[str] | None:
    """Render one VEVENT block as a list of folded content lines.

    Returns None if the job has no usable deadline.
    """
    deadline = _job_deadline(job)
    if deadline is None:
        return None

    job_id = str(job.get("id") or "").strip() or "unknown"
    company = str(job.get("company") or "").strip() or "Unknown company"
    title = str(job.get("title") or "").strip() or "Job"
    url = str(job.get("url") or "").strip()
    description_raw = _truncate_description(job.get("description"))

    description = description_raw
    if url:
        # Two literal newlines separate the snippet from the link.
        if description:
            description = f"{description}\n\nLink: {url}"
        else:
            description = f"Link: {url}"

    summary = f"Apply: {company} — {title}"

    # All-day event: DTSTART is the deadline date, DTEND is the
    # following day per RFC 5545 §3.6.1 (DTEND is exclusive).
    dtend = deadline + timedelta(days=1)

    lines: list[str] = []
    _emit(lines, "BEGIN", "VEVENT")
    _emit(lines, "UID", f"{job_id}@{UID_DOMAIN}")
    _emit(lines, "DTSTAMP", dtstamp)
    _emit(lines, "DTSTART;VALUE=DATE", _date_stamp(deadline))
    _emit(lines, "DTEND;VALUE=DATE", _date_stamp(dtend))
    _emit(lines, "SUMMARY", _escape_text(summary))
    if description:
        _emit(lines, "DESCRIPTION", _escape_text(description))
    if url:
        # URL is a URI value; not TEXT-escaped, but still folded.
        _emit(lines, "URL", url)
    _emit(lines, "STATUS", "CONFIRMED")
    _emit(lines, "TRANSP", "TRANSPARENT")
    _emit(lines, "END", "VEVENT")
    return lines


def build_deadlines_ical(
    jobs: Iterable[dict],
    *,
    calendar_name: str = DEFAULT_CALENDAR_NAME,
    now: datetime | None = None,
) -> str:
    """Serialize ``jobs`` into an RFC 5545 VCALENDAR body.

    Jobs without a parseable deadline are skipped silently. Events are
    emitted in ascending deadline order so the output is stable for tests
    and diff-friendly when a user re-downloads the file.

    The returned string uses CRLF line endings and ends with a trailing
    CRLF (RFC 5545 requires lines to end in CRLF; many parsers also
    expect a final CRLF after END:VCALENDAR).
    """
    stamp = _utc_stamp(now or datetime.now(timezone.utc))

    header: list[str] = []
    _emit(header, "BEGIN", "VCALENDAR")
    _emit(header, "VERSION", "2.0")
    _emit(header, "PRODID", PRODID)
    _emit(header, "CALSCALE", "GREGORIAN")
    _emit(header, "METHOD", "PUBLISH")
    _emit(header, "NAME", _escape_text(calendar_name))
    _emit(header, "X-WR-CALNAME", _escape_text(calendar_name))
    _emit(header, "X-WR-TIMEZONE", "UTC")

    # Build (deadline, event-lines) tuples first so we can sort
    # deterministically by date, then by job id as a tiebreak.
    events: list[tuple[date, str, list[str]]] = []
    for job in jobs:
        deadline = _job_deadline(job)
        if deadline is None:
            continue
        rendered = _build_event(job, stamp)
        if rendered is None:
            continue
        events.append((deadline, str(job.get("id") or ""), rendered))

    events.sort(key=lambda t: (t[0], t[1]))

    body: list[str] = []
    for _, _, lines in events:
        body.extend(lines)

    footer = [_fold_line("END:VCALENDAR")]

    all_lines = header + body + footer
    return CRLF.join(all_lines) + CRLF
