#!/usr/bin/env python3
"""
Audit job-source slugs to see which boards are live.

Companies migrate between ATS providers constantly — a slug that worked six
months ago may now 404 because the company moved from Lever to Ashby.  Run
this script before wiring a slug into the nightly cron so your cron's failure
log stays clean.

Usage:
    python -m backend.scripts.audit_sources --source lever --ids lever,mixpanel,mux
    python -m backend.scripts.audit_sources --source ashby --ids ramp,linear,notion
    python -m backend.scripts.audit_sources --preset   # audit curated defaults
    python -m backend.scripts.audit_sources --preset --json > audit.json

Output:
    Human-readable table by default:
        source=lever
          ✓ lever        (42 jobs, 812ms)
          ✗ netflix      (timeout after 10s)
          ✗ figma        (HTTP 404 — migrated?)

    With --json, emits a machine-readable report suitable for piping into a
    CI step that updates a verified-slug registry.

Exit codes:
    0  — audit completed (even if some slugs failed).  This is intentional:
         CI workflows should treat slug failures as data quality, not errors.
    1  — invoked with an unknown source, or no slugs were given.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

# Allow running as `python backend/scripts/audit_sources.py`.
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.services.ingestion import list_sources  # noqa: E402


# Curated defaults, trimmed down to slugs known to have a public board as of
# the last time this file was updated.  Still verify before trusting — ATS
# migrations happen monthly.
PRESET_SLUGS: dict[str, list[str]] = {
    "greenhouse": ["airbnb", "stripe", "anthropic", "openai", "gitlab", "dropbox"],
    "lever": ["lever", "mixpanel", "mux", "attentive", "gopuff", "whatnot"],
    "ashby": ["ramp", "linear", "notion", "mercury", "retool", "posthog", "vercel"],
}


def _check_slug(source: Any, slug: str, timeout: float) -> dict[str, Any]:
    """Fetch one slug from one source. Return a status dict.

    We patch the source's `_fetch_json` timeout implicitly by setting the
    module-level default — sources expose a timeout kwarg via `_fetch_json`
    but `source.fetch` doesn't plumb it through. Keeping the fetch timeout
    generous (default 20s) is fine for cron, but noisy for an auditor;
    override via monkey-patch when needed.
    """
    start = time.monotonic()
    try:
        jobs = source.fetch([slug])
        elapsed_ms = int((time.monotonic() - start) * 1000)
        return {
            "slug": slug,
            "ok": True,
            "count": len(jobs),
            "elapsed_ms": elapsed_ms,
            "error": None,
        }
    except Exception as e:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        msg = str(e) or type(e).__name__
        # Disambiguate a timeout so the user doesn't read it as "board gone".
        low = msg.lower()
        if "timed out" in low or "timeout" in low:
            msg = f"timeout after {elapsed_ms // 1000}s"
        elif "404" in msg:
            msg = "HTTP 404 — migrated or board removed?"
        return {
            "slug": slug,
            "ok": False,
            "count": 0,
            "elapsed_ms": elapsed_ms,
            "error": msg,
        }


def _patch_timeout(source_name: str, timeout: float) -> None:
    """Override the module-level `_fetch_json` default timeout."""
    import importlib
    mod_name = f"backend.app.services.ingestion.{source_name}"
    try:
        mod = importlib.import_module(mod_name)
    except ImportError:
        return
    if not hasattr(mod, "_fetch_json"):
        return
    original = mod._fetch_json

    def _patched(url: str, timeout: float = timeout):  # type: ignore[override]
        return original(url, timeout=timeout)

    mod._fetch_json = _patched  # type: ignore[assignment]


def _audit_source(source_name: str, slugs: list[str], timeout: float) -> list[dict[str, Any]]:
    sources = list_sources()
    factory = sources.get(source_name)
    if not factory:
        raise SystemExit(
            f"Unknown source '{source_name}'. Known: {', '.join(sorted(sources))}"
        )
    _patch_timeout(source_name, timeout)
    source = factory()
    return [_check_slug(source, s, timeout) for s in slugs]


def _print_table(source_name: str, results: list[dict[str, Any]]) -> None:
    # Colour codes; auto-disable when stdout isn't a TTY.
    use_color = sys.stdout.isatty()
    green = "\033[32m" if use_color else ""
    red = "\033[31m" if use_color else ""
    dim = "\033[2m" if use_color else ""
    reset = "\033[0m" if use_color else ""

    print(f"source={source_name}", file=sys.stderr)
    width = max((len(r["slug"]) for r in results), default=10)
    for r in results:
        slug = r["slug"].ljust(width)
        if r["ok"]:
            print(
                f"  {green}✓{reset} {slug}  "
                f"({r['count']} jobs, {dim}{r['elapsed_ms']}ms{reset})",
                file=sys.stderr,
            )
        else:
            print(
                f"  {red}✗{reset} {slug}  ({r['error']})",
                file=sys.stderr,
            )


def main() -> int:
    ap = argparse.ArgumentParser(description="Audit job-source slugs")
    ap.add_argument("--source", help="Single source to audit (e.g. 'lever')")
    ap.add_argument("--ids", help="Comma-separated slugs to check")
    ap.add_argument(
        "--preset",
        action="store_true",
        help="Audit all sources against a curated slug list",
    )
    ap.add_argument(
        "--timeout",
        type=float,
        default=10.0,
        help="Per-request timeout in seconds (default: 10)",
    )
    ap.add_argument(
        "--json",
        action="store_true",
        help="Emit a machine-readable JSON report on stdout",
    )
    args = ap.parse_args()

    jobs: dict[str, list[dict[str, Any]]] = {}

    if args.preset:
        known = set(list_sources().keys())
        for source_name, slugs in PRESET_SLUGS.items():
            if source_name not in known:
                continue
            results = _audit_source(source_name, slugs, args.timeout)
            jobs[source_name] = results
            if not args.json:
                _print_table(source_name, results)
    elif args.source and args.ids:
        slugs = [s.strip() for s in args.ids.split(",") if s.strip()]
        if not slugs:
            print("No slugs provided", file=sys.stderr)
            return 1
        results = _audit_source(args.source, slugs, args.timeout)
        jobs[args.source] = results
        if not args.json:
            _print_table(args.source, results)
    else:
        print(
            "Either --preset or (--source AND --ids) is required",
            file=sys.stderr,
        )
        return 1

    if args.json:
        report = {
            "sources": jobs,
            "summary": {
                name: {
                    "total": len(results),
                    "ok": sum(1 for r in results if r["ok"]),
                    "failed": sum(1 for r in results if not r["ok"]),
                    "jobs_found": sum(r["count"] for r in results if r["ok"]),
                }
                for name, results in jobs.items()
            },
        }
        try:
            print(json.dumps(report, indent=2))
        except BrokenPipeError:
            try:
                sys.stdout.close()
            except Exception:
                pass

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        try:
            sys.stdout.close()
        except Exception:
            pass
        raise SystemExit(0)
