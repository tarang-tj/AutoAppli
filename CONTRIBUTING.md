# Contributing to AutoAppli

Thanks for poking around. This guide covers how the repo is laid out,
how to get a local dev loop running, and the conventions we hold the
line on. The goal is to make your first patch boring — predictable
setup, predictable lint output, predictable PR shape.

For deeper architectural context, read `CLAUDE.md` at the repo root —
the same orientation we hand to AI agents working in the codebase.

---

## Repo layout

Three deployable surfaces, one repo:

```
AutoAppli/
├── backend/        FastAPI (Python 3.12) — deployed to Render
├── frontend/       Next.js 16 App Router (React 19, Tailwind 4) — deployed to Vercel
├── extension/      Chrome MV3 extension (read-only — saves jobs to backend)
├── supabase/       Postgres migrations (numbered SQL)
├── docs/           Architecture, roadmap, changelog, brand
└── plans/          Implementation plans + reports
```

The extension is **read-only**: it scrapes job-page DOM and POSTs to the
backend's `/api/v1/jobs`. It does **not** auto-fill ATS forms or click
apply. Keep this honest in any feature/PR description.

---

## Local dev setup

### Prerequisites

- Node.js 18+ (we test on 20)
- Python 3.11+ (3.12 is what production runs)
- A Supabase project (or run with no env vars for demo mode)
- An Anthropic API key (only needed if you're touching AI routes)

### Required env vars

**Frontend** — `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000        # optional — omit to run frontend-only against demo data
ANTHROPIC_API_KEY=...                            # only for /api/ai/* routes
```

**Backend** — `backend/.env` (copy `backend/.env.example` first):

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
ANTHROPIC_API_KEY=...
CORS_ORIGINS=http://localhost:3000
```

If you skip Supabase env vars, both surfaces fall back to in-memory /
demo mode. The frontend's "Try demo" button is the canonical way to
exercise the UI without real data.

### Run it

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate shell)
cd frontend
npm install
npm run dev
# → http://localhost:3000

# Extension
# Open chrome://extensions, enable Developer Mode,
# Load unpacked → select extension/ directory.
```

---

## Lint, typecheck, test

Run the surface that matches your change. PRs should pass these locally
before you ask for review.

### Frontend

```bash
cd frontend
npm run lint         # ESLint — currently advisory in CI, blocking locally
npx tsc --noEmit     # Typecheck — blocking in CI
npm run build        # next build --webpack — final smoke test
```

### Backend

```bash
cd backend
pytest                    # full suite
pytest tests/test_auth.py # one file
pytest -k retry           # by name
```

`backend/conftest.py` adds the project root to `sys.path` and stubs
Anthropic with a 401-faking client when no API key is present, so
collection works in CI without secrets. Don't replace it with
`pyproject` rootdir tricks — it's the simpler answer.

### Extension

No automated tests. Manual smoke test: load unpacked, visit a
Greenhouse / Lever / Indeed posting, click the extension icon, confirm
the job appears in your dashboard.

---

## Commit messages — conventional commits

Format:

```
<type>(<scope>): <subject>
```

Types we use: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `ci`,
`perf`. Scope is optional but encouraged when the surface is obvious
(`feat(jobs):`, `fix(kanban):`, `docs(jobs):`).

**Subject line ≤ 70 chars, imperative mood**, no trailing period.

Examples from history:

```
feat(jobs): shadow-write posting_key and cached_jobs_sightings
fix(kanban): a11y for board, columns, cards, and card dialogs
test(backend): add pytest coverage for resume, outreach, and auth routers
chore: enable JOBS_DEDUP_V1 shadow-write
```

### No AI references in commit messages

If your commit was AI-assisted, that's fine — the commit still gets
your name. **Do not** append `Co-authored-by: Claude` or `Generated
with Cursor` or any equivalent. The commit history is for humans
reading `git log`; tooling is implementation detail.

This is a hard rule — see `.claude/rules/development-rules.md`.

---

## Pull requests

- Branch off `main`. Name it something readable — `a11y-discover`,
  `retry-ai-calls`, `pr3-jobs-dedup` are all fine.
- Squash commits if your branch has WIP noise. Keep them separate if
  each one stands alone.
- PR title follows the same conventional-commit format as commits.
- PR body should answer: **what changed, why, and how to verify**.
- Don't ship features without docs sync — at minimum, tick the
  relevant box in `docs/development-roadmap.md` and add a line to
  `docs/project-changelog.md` under today's date.

---

## Accessibility conventions

The 2026-04-24 a11y sweep established these patterns. Follow them when
adding new UI. The goal isn't to chase WCAG AAA — it's "doesn't feel
broken if you tab through it."

- **Form labels.** Every input has a `<label htmlFor>` paired by `id`,
  not wrapping the input. Visually-hidden labels (`sr-only`) are fine
  when there's a visible icon or placeholder doing the heavy lifting.
  See `frontend/src/components/dashboard/add-job-form.tsx`.
- **Decorative icons.** If an icon repeats text that's already there
  (chevron next to "Open"), give it `aria-hidden="true"`. If it's the
  only label (icon-only button), add `aria-label`.
- **Focus traps.** All modals/dialogs use the `useFocusTrap` hook in
  `frontend/src/hooks/use-focus-trap.ts`. Don't roll your own — the
  shared hook handles ESC, focus return, and the inert-background trap
  consistently.
- **Live regions.** Async UI changes (loading, error, success toasts)
  go through `aria-live="polite"`. Never nest live regions; one per
  region of the page is enough. Defer announcements until after the
  state actually settled (don't fire on every keystroke).
- **Keyboard.** Drag-and-drop on the kanban has a keyboard fallback
  (`@hello-pangea/dnd` provides this — don't disable it). All custom
  dropdowns are arrow-key navigable.

When in doubt, copy the pattern from a recently-touched route — every
page in `frontend/src/app/` was visited in the sweep, so all of them
are good references.

---

## Where to look when stuck

- Architecture / route map: `docs/codemap.md` (regenerated by
  `graphify`, so it's always current).
- Implementation history: `docs/level-up/IMPLEMENTED.md`.
- Forward roadmap: `docs/development-roadmap.md`.
- Brand voice (if you're writing copy): `docs/brand-guidelines.md`.
- Per-surface guidance: `frontend/CLAUDE.md`, `frontend/AGENTS.md`
  (Next.js 16 has breaking changes — read before assuming Next 15 docs
  still apply).

---

## License

By contributing, you agree your changes are released under the project's
MIT license.
