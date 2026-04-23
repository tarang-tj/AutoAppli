# Level-up — What the Nuclear Patch Shipped

5 grouped commits, 2026-04-23. Safe to re-run `apply-autoappli-nuclear.sh` (each edit is idempotent).

## Commit 1 — backend security

- **Phase 0.2** JWT audience escape hatch removed (`backend/app/deps/jobs_auth.py`)
- **Phase 0.3** `ProfilePatch` + `ProfileResponse` carry full extended schema; `extra="forbid"` on PATCH (`backend/app/models/schemas.py`)
- **Phase 0.4** SSRF lockdown: host allowlist, `follow_redirects=False`, content-type check (`backend/app/services/scraper_service.py`)
- **Phase 1.9** `extra="forbid"` flipped on AI response schemas (`backend/app/models/schemas.py`)
- **New** `Settings.validate_required_env()` for startup health check (`backend/app/config.py`)

## Commit 2 — frontend security + SEO

- **Phase 1.5** CSP + HSTS response headers (`frontend/next.config.ts`)
- **Phase 2.6** `SoftwareApplication` JSON-LD in root layout (`frontend/src/app/layout.tsx`)
- **UX** Toaster moved from top-center to bottom-right (avoids header overlap)

## Commit 3 — AI route hardening

- **Phase 1.8** `redactPII` utility (`frontend/src/lib/redact-pii.ts`)
- **Phase 1.8** XML-wrap user content in backend prompts (`resume_prompt.py`, `outreach_prompt.py`)
- **Phase 1.8** `tailor-resume` route rewritten with `<resume>` / `<job_description>` / `<user_instructions>` tags
- **Phase 1.8** `redactPII` applied to error-log paths across all 6+ AI routes

## Commit 4 — UX quick wins

- **Phase 0.6** Responsive `grid-cols-1 sm:grid-cols-2` in dashboard Add-Job form (5 instances)
- **Phase 1.12-lite** `eval-score-card` tiny text (10-11px) bumped to `text-xs` / `text-sm` for WCAG AA

## Commit 5 — docs

- **Phase 0.9** CLAUDE.md codemap path aligned with reality
- This file (IMPLEMENTED.md)
- FOLLOW-UPS.md — the items not shipped here, with concrete recipes

