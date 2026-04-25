"""
Shared pytest configuration for the backend test suite.

Two responsibilities:

1. sys.path normalization — tests in this directory use two different
   import styles:
     - `from app.<module> import ...`            (cwd-relative; needs `backend/` on path)
     - `from backend.app.<module> import ...`    (repo-relative; needs the repo root on path)

   Both styles existed before this conftest. To keep the suite collecting
   under either invocation (`pytest` from repo root, or `pytest` from
   `backend/` as the GitHub Actions workflow does), inject both directories
   into sys.path before any test module imports.

2. Anthropic-call mocking when the CI placeholder key is in play —
   `test_cover_letter_service.py` does NOT mock Anthropic explicitly and
   would hit the real API (and 401) in CI where `ANTHROPIC_API_KEY` is
   set to `"test-key-not-real"`. Newer tests mock at their own call sites,
   but this older test predates that pattern. To keep CI green without
   editing the existing test file (and without changing local-dev behaviour
   when a real key is present), an autouse fixture patches the call site
   only when the placeholder key is detected.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

_THIS_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _THIS_DIR.parent
_REPO_ROOT = _BACKEND_DIR.parent

for _p in (str(_BACKEND_DIR), str(_REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Sentinel value the GitHub Actions workflow sets in `ANTHROPIC_API_KEY`.
# Real keys never collide with this string.
_CI_DUMMY_KEY = "test-key-not-real"


@pytest.fixture(autouse=True)
def _mock_anthropic_in_ci():
    """Mock `generate_text` at known consumer modules when the CI dummy key is set.

    Per-test fixture (function scope) so individual tests can still apply
    their own `patch` decorators on top — those will override this fixture's
    mock for the duration of that test, then this fixture's mock is restored.
    """
    if os.getenv("ANTHROPIC_API_KEY") != _CI_DUMMY_KEY:
        yield
        return

    canned = (
        "Dear Hiring Manager,\n\n"
        "Mocked cover letter body for CI. The real Anthropic call was bypassed because "
        "ANTHROPIC_API_KEY is the placeholder value used by the test workflow. The service "
        "structure (id prefix, tone passthrough, created_at) is still asserted by the test.\n\n"
        "Sincerely,\nApplicant"
    )

    # Patch at the call site (`from claude_service import generate_text` already
    # bound the name in the consumer module). Add new modules here if they show
    # up in CI failures.
    patches = [
        patch(
            "app.services.cover_letter_service.generate_text",
            new=AsyncMock(return_value=canned),
        ),
    ]
    for p in patches:
        p.start()
    try:
        yield
    finally:
        for p in patches:
            p.stop()
