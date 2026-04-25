# AutoAppli — Project Changelog

Append-only log of significant changes. Group by date. Cite short commit
SHAs (7 chars) at the end of each bullet so historical entries stay
grep-able after force-pushes or branch reshuffles.

For the longer narrative behind each phase, see `docs/level-up/IMPLEMENTED.md`.
For the forward-looking view, see `docs/development-roadmap.md`.

---

## 2026-04-24 — Quality + accessibility hardening

Big internal-quality push across the frontend, plus first cross-cutting
backend test coverage. Goal was to make the surface ready for student
traffic in Q3 without the kind of low-bar issues (form labels, focus
traps, retryable AI failures) that look unprofessional under load. No
new user-facing features — entirely correctness, a11y, and SEO.

### Accessibility sweep (~16 commits)

WCAG-AA pass across every page that had a real form, dialog, or focus
trap to fix. Pattern was consistent: visible labels paired with their
inputs, decorative icons hidden from screen readers, polite live regions
for async UI states, and `useFocusTrap` on every dialog the user can
escape into. Code-review follow-ups landed last to fix nested live
regions and an over-eager announcement timing bug.

- Marketing landing — focus order, typography contrast, decorative-icon
  cleanup. (`3ec97d2`)
- Dashboard — Add Job form labels, app shell landmarks. (`3be8da2`)
- Kanban — board/column/card semantics + dialog focus management. (`a589b0a`)
- Chrome (header / sidebar / command palette / shortcuts help). (`909d5d7`)
- Auth pages — autocomplete attributes, error announcements. (`171cb41`)
- Discover — page, filter panel, cards, recommendations rail. (`873e2da`)
- Resume builder — page + components. (`a922849`)
- Cover-letter + outreach — AI document generators. (`4c34ef9`)
- Jobs page — search, form, result cards. (`c7346d1`)
- Interviews — prep page + AI practice chat. (`9af7114`)
- Settings — profile + preferences forms. (`854ff37`)
- Code-review follow-ups — focus-trap hook, nested live region fix,
  deferred announcements. (`a229c54`)
- Dashboard sub-widgets + feedback widget. (`f37f62c`)
- Timeline, contacts, salary, notifications, resume-templates. (`8eaca8c`)
- Automation, analytics, export, templates, resume-diff. (`5fa80bf`)

### React 19 lint debt cleanup (~1 commit)

Cleared the residual lint warnings that piled up during the React 19
migration. `useSyncExternalStore` swaps for hand-rolled localStorage
sync hooks (race-free across tabs), render-time clamping of derived
values (so we don't trip the new "no setState in render" rule), and
type narrowing where TypeScript's flow analysis got tighter.

- 10 files touched. (`89241a5`)

### SEO / per-page metadata (~1 commit)

Page-specific `<title>` and `<meta description>` for all 21 routes via
parallel `layout.tsx` files. Previously every page inherited the root
metadata, so Google saw a single title across the whole product. The
`layout.tsx`-per-route approach keeps the marketing copy under
`metadata` exports rather than scattering `<Head>` tags through
client components.

- 21 routes covered. (`7e312c5`)

### Backend test coverage + CI unblock (~2 commits)

First real pytest coverage on the AI-touching routers. Each test mocks
Anthropic at the SDK boundary so CI doesn't need a live API key, and
the new `conftest.py` resolves the sys.path issue that was causing
collection to fail on every fresh check-out. Fixes the false-positive
401s in CI when Anthropic isn't reachable.

- New test files for resume, outreach, and auth routers. (`c84b4ed`)
- `conftest.py` — unblocks CI test collection + Anthropic 401 fix. (`e489c87`)

### AI-call retry + observability groundwork (this PR)

Frontend now retries transient AI failures (network blip / 5xx) up to
twice with 200ms+800ms exponential backoff. Idempotent flag on
`apiPost` for non-AI callers; AI routes auto-retry because the
backend assigns fresh request IDs per call. Global error listener
emits a structured `console.error` payload + dispatches an
`autoappli:error` `CustomEvent` so a future Sentry / PostHog hook
attaches without editing the listener.

- `frontend/src/lib/api.ts` — `fetchWithRetry`, `ApiPostOptions { idempotent }`.
- `frontend/src/components/layout/global-error-listener.tsx` —
  structured payload + `autoappli:error` CustomEvent.

### Docs sync (this PR)

- `docs/project-changelog.md` — this file (new).
- `docs/development-roadmap.md` — Q2 progress checkboxes ticked, Q3
  orientation note added.
- `CONTRIBUTING.md` — new repo-root contributor guide.

---

## Older entries

For pre-2026-04-24 history, see `docs/level-up/IMPLEMENTED.md` (covers
the v1/v2/v3 nuclear patches and Phase A/B/C/D shipping notes through
2026-04-23).
