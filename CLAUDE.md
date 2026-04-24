# AutoAppli — Engineering Orientation for Claude Code

Job-search workspace for students. Find roles, tailor resumes and outreach with AI, track everything on a kanban. Shipped and live. Initial audience wedge is college students running internship and new-grad searches.

**What AutoAppli does NOT do (important for anyone writing copy or features):** does not auto-submit applications, does not fill ATS forms on the user's behalf, does not spam submit buttons. The user still clicks apply on the company's own page. Extension is read-only (saves jobs to the board). Backend has no browser-automation libs (no selenium/playwright/puppeteer). `automation_service.py` handles kanban status rules, not form submission. Keep this honest in docs, features, and marketing copy.

## Repo Layout (three surfaces, one repo)

```
AutoAppli/
├── backend/         FastAPI (Python 3.12) — deployed to Render
├── frontend/        Next.js 16 App Router — deployed to Vercel
├── extension/       Chrome MV3 extension
├── supabase/        Postgres migrations (numbered SQL)
├── docs/            Architecture, roadmap, changelog, brand, code standards
└── plans/           Implementation plans + reports (ClaudeKit workflow)
```

## Backend (`backend/`)

- **Framework:** FastAPI + Uvicorn. Entrypoint: `backend/app/main.py`. Run locally via `uvicorn app.main:app` from `backend/`.
- **Deploy:** `render.yaml` (Docker, port 8000, health check `/api/v1/health`).
- **Layout under `backend/app/`:**
  - `routers/` — 16 endpoint modules (`auth`, `jobs`, `search`, `match`, `resume`, `outreach`, `automation`, `interview`, `cover_letter`, `profile`, `salary`, `analytics`, `export`, `templates`, `timeline`, `contacts`, `notifications`).
  - `services/` — business logic. Hot spots:
    - `claude_service.py` — Anthropic SDK wrapper, supports prompt caching via `cache_system` flag.
    - `live_search_service.py` — multi-source firehose (Supabase `cached_jobs` + live Indeed scraper, URL dedup).
    - `scraper_service.py` — Indeed/Workday scrapers.
    - `match_v2.py` — structured job–profile match scorer.
    - `ingestion/` — 7 ATS parsers (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, WeWorkRemotely, base).
  - `repositories/` — data access layer (Supabase-backed with memory fallbacks for tests).
  - `deps/jobs_auth.py` — Supabase JWT verification via PyJWT.
  - `middleware/rate_limit.py` — slowapi, applied to AI routes.
  - `models/`, `prompts/`, `utils/`.
- **Tests:** `backend/tests/test_*.py` (pytest). Run: `cd backend && pytest`.
- **Key deps:** fastapi, uvicorn, anthropic, supabase, beautifulsoup4, reportlab, slowapi, pyjwt.

## Frontend (`frontend/`)

- **Stack:** Next.js 16.2 (App Router, webpack), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, @base-ui/react.
- **Entry:** `frontend/src/app/` — App Router only (no `pages/`).
- **Key routes:**
  - `(auth)/` — login, signup, forgot-password, callback.
  - `/` — landing (Three.js 3D hero, FAQ, JSON-LD).
  - `/dashboard` — kanban (mobile-snap, @hello-pangea/dnd).
  - `/discover` — live search UI.
  - `/jobs` — saved job list.
  - `/resume`, `/resume-templates`, `/cover-letter` — document generation.
  - `/interviews`, `/interview-practice` — interview prep.
  - `/automation`, `/contacts`, `/outreach`, `/timeline`, `/salary`, `/analytics`, `/export`, `/templates`, `/settings`.
- **Data/state:** SWR + Supabase SSR client. Central API client at `frontend/src/lib/api.ts`. Auth clients in `frontend/src/lib/supabase/`.
- **Client-side AI:** `@anthropic-ai/sdk` used directly for some flows.
- **PDFs:** jsPDF + jspdf-autotable for resume export.
- **Scripts:** `npm run dev | build | lint` (run from `frontend/` or via root `--prefix frontend`).
- **Frontend-specific notes:** see `frontend/CLAUDE.md` and `frontend/AGENTS.md` (flags Next.js 16 breaking changes).

## Extension (`extension/`)

- **Manifest v3.** Permissions: `activeTab`, `storage`. Host matches: LinkedIn, Greenhouse, Lever, Ashby, Indeed, Workday.
- **Files:**
  - `popup.html` / `popup.js` — one-click save UI.
  - `background.js` — service worker; message router to backend API.
  - `content.js` — DOM parsing, injects UI on job pages.
  - `parsers/` — per-board extractors: `generic.js`, `greenhouse.js`, `lever.js`, `indeed.js`, `linkedin.js`.
- **Talks to:** backend `/api/v1/jobs` to persist saved jobs.

## Database (`supabase/`)

- Supabase Postgres. Migrations in `supabase/migrations/` as numbered SQL files (e.g., `20260406120000_create_jobs.sql`).
- **Tables (inferred):** `jobs`, `cached_jobs`, `profiles`, `generated_documents`, `resume_eval_results`, `interview_notes`, `notifications`, `salary_data`, `contacts`, `timeline`, `templates`, `automation_rules`, `search_accuracy`, `job_search`, `interview_practice_sessions`, `job_outcome_tracking`.
- **Auth:** Supabase Auth, server verifies JWTs via PyJWT.

## Running Things Locally

| Surface  | Command                                                        |
| -------- | -------------------------------------------------------------- |
| Backend  | `cd backend && uvicorn app.main:app --reload --port 8000`      |
| Frontend | `cd frontend && npm run dev`                                   |
| Extension| Load `extension/` unpacked via `chrome://extensions`           |
| Tests    | `cd backend && pytest`  •  `cd frontend && npm run lint`       |

## CI / Deploy

- **Backend:** Render via `render.yaml`. Dockerfile at `backend/Dockerfile`.
- **Frontend:** Vercel via `vercel.json` (iad1).
- **GitHub Actions:** see `.github/workflows/` for backend CI (Phase B4).

## Recent Trajectory (informs "what's hot")

Recent commits cluster around: live multi-source search (Phase A1), match v2 structured scoring (A2), backend CI + perf indexes + live_search tests (B4/A4), prompt caching flag (B3), AI route auth + rate limits (B1/B2), command palette + theme + dashboard skeletons (C1–C3), landing FAQ + Three.js hero, ADR acceptance workflow.

Active surface: search quality, match accuracy, rate limiting, caching, and landing/kanban UX polish.

## Project Conventions

- `.claude/rules/` holds durable rules (development, orchestration, docs, team coordination). Read before multi-step work.
- Plans live under `plans/` with naming `YYMMDD-HHMM-slug/`. Reports under `plans/reports/`.
- Conventional commits, no AI references in messages.
- File size target: <200 lines per code file; split when growing.
- Keep docs under `docs/` current when architecture shifts.

## Where to Look First

- Architecture details: `docs/system-architecture.md`
- Roadmap status: `docs/development-roadmap.md`
- Changelog: `docs/project-changelog.md`
- Code standards: `docs/code-standards.md`
- Brand / voice (marketing): `docs/brand-guidelines.md`
- Codemap index: `docs/codemap.md` + `docs/codemap.json`
