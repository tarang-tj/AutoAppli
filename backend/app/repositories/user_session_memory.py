"""Per-user in-memory stores for resume uploads and outreach when Postgres is not used for those domains."""

from __future__ import annotations

DEMO_KEY = "__demo__"


def _key(user_id: str | None) -> str:
    return user_id if user_id is not None else DEMO_KEY


_resumes_by_user: dict[str, dict[str, dict]] = {}
_outreach_by_user: dict[str, list[dict]] = {}
_interviews_by_user: dict[str, list[dict]] = {}
_reminders_by_user: dict[str, list[dict]] = {}
_compensations_by_user: dict[str, list[dict]] = {}
_jobs_by_user: dict[str, dict[str, dict]] = {}
_contacts_by_user: dict[str, list[dict]] = {}
_timeline_by_user: dict[str, list[dict]] = {}


def resume_store(user_id: str | None) -> dict[str, dict]:
    k = _key(user_id)
    if k not in _resumes_by_user:
        _resumes_by_user[k] = {}
    return _resumes_by_user[k]


def outreach_messages(user_id: str | None) -> list[dict]:
    k = _key(user_id)
    if k not in _outreach_by_user:
        _outreach_by_user[k] = []
    return _outreach_by_user[k]


def interview_notes(user_id: str | None) -> list[dict]:
    k = _key(user_id)
    if k not in _interviews_by_user:
        _interviews_by_user[k] = []
    return _interviews_by_user[k]


def reminders(user_id: str | None) -> list[dict]:
    k = _key(user_id)
    if k not in _reminders_by_user:
        _reminders_by_user[k] = []
    return _reminders_by_user[k]


def compensations(user_id: str | None) -> list[dict]:
    k = _key(user_id)
    if k not in _compensations_by_user:
        _compensations_by_user[k] = []
    return _compensations_by_user[k]


def job_store(user_id: str | None) -> dict[str, dict]:
    k = _key(user_id)
    if k not in _jobs_by_user:
        _jobs_by_user[k] = {}
    return _jobs_by_user[k]


def contacts(user_id: str | None) -> list[dict]:
    k = _key(user_id)
    if k not in _contacts_by_user:
        _contacts_by_user[k] = []
    return _contacts_by_user[k]


def timeline_events(user_id: str | None) -> list[dict]:
    k = _key(user_id)
    if k not in _timeline_by_user:
        _timeline_by_user[k] = []
    return _timeline_by_user[k]
