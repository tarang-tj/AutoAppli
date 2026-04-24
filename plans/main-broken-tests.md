# Pre-existing test collection errors on `main`

**Status:** Open — to fix after PR 2 merges. Not blocking.
**Discovered:** 2026-04-24, while running the test suite for PR 2 (`cached_jobs` shadow-write).

## Summary

Four service tests fail to collect on `main` because of an import-path inconsistency: they use `from app.services.X` while every other test in the suite (and the working ingestion tests) use the project convention `from backend.app.services.X`. Python finds no top-level `app` module when invoked as `python -m pytest backend/tests/`, so all four error out at import time.

Verified that PR 2 is not the cause — the failures reproduce on a clean `main` checkout with PR 2 changes stashed (`git stash -u`).

## Affected files

| File | Failing import |
| --- | --- |
| `backend/tests/test_analytics_service.py` | `from app.services.analytics_service import compute_analytics` |
| `backend/tests/test_automation_service.py` | `from app.services.automation_service import (...)` |
| `backend/tests/test_contacts_service.py` | `from app.services.contacts_service import make_contact, add_interaction` |
| `backend/tests/test_cover_letter_service.py` | `from app.services.cover_letter_service import generate_cover_letter, TONE_OPTIONS` |

## Error message (representative)

```
ImportError while importing test module
'/Users/.../AutoAppli-clean/backend/tests/test_analytics_service.py'.
Hint: make sure your test modules/packages have valid Python names.
Traceback:
  /opt/anaconda3/lib/python3.12/importlib/__init__.py:90: in import_module
      return _bootstrap._gcd_import(name[level:], package, level)
  backend/tests/test_analytics_service.py:6: in <module>
      from app.services.analytics_service import compute_analytics
  E   ModuleNotFoundError: No module named 'app'
```

The other three modules error identically; only the import target differs.

## Likely fix (≤5 minutes)

Rewrite the imports in those four files to match the convention used by `test_ingestion_greenhouse.py`, `test_match_v2.py`, etc.:

```diff
- from app.services.analytics_service import compute_analytics
+ from backend.app.services.analytics_service import compute_analytics
```

Same edit for the other three. No production code changes; no fixture changes.

Alternative (broader): add a `conftest.py` at `backend/tests/` that prepends `backend/` to `sys.path` so both shapes work. This matches what `backend/scripts/ingest_all.py` already does at the script entry. But the simpler fix is just to rewrite the imports — the inconsistency was probably a slip during a copy-paste.

## Out of scope here

- Fixing the actual tests (do this in a separate PR after PR 2 merges).
- Investigating whether these tests pass once collected (they may have other rot — only the import error is visible right now).
