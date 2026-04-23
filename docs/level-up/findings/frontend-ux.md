# Findings — Frontend + UX + Accessibility + Mobile

_Severity: **HIGH** > **MED** > **LOW**. ✅ = spot-checked against source._

## Summary

Solid foundations (Next.js 16, TS strict, Tailwind, shadcn, SWR, optimistic updates), but three persistent themes: mobile-hostile defaults, systematic a11y gaps, and perceived-perf regressions from unskeletoned `<Suspense fallback={null}>` boundaries. The core kanban workflow is unusable on phones without a form-layout fix.

## Findings

### [HIGH] Dialog grid `grid-cols-2` not responsive ✅
- **Where:** `frontend/src/app/dashboard/page.tsx` lines 221, 236, 246, 328, 338 (all 5 verified)
- **Impact:** on 375px viewports, two-column form rows collapse so narrow that labels and inputs overlap.
- **Fix:** `grid grid-cols-1 sm:grid-cols-2 gap-3`. Roadmap 0.6.
- **Effort:** S

### [HIGH] Form inputs default to 14px → iOS autozooms on focus
- **Where:** `frontend/src/components/ui/input.tsx`, `textarea.tsx`
- **Impact:** every focus on a text field triggers iOS Safari zoom-in; page jumps after blur. Makes the Add Job flow feel broken on iPhone.
- **Fix:** default the Input/Textarea className to `text-base`. Roadmap 0.7.
- **Effort:** S

### [HIGH] ARIA labels almost entirely missing
- **Where:** grep returned only 3 `aria-label` instances across 38 component files.
- **Impact:** icon buttons (Download, Search, Plus, Send, Sparkles), modal dialogs, kanban cards — all invisible to screen readers. WCAG 2.1 AA level-2 violation.
- **Fix:** Roadmap 1.12. Audit via axe-core; label every icon button and add `aria-describedby` on dialogs.
- **Effort:** M

### [HIGH] Kanban has no keyboard navigation
- **Where:** `frontend/src/components/dashboard/kanban-board.tsx` (uses `@hello-pangea/dnd`)
- **Impact:** motor-impaired users and keyboard-power-users can't reorder or move cards.
- **Fix:** `@hello-pangea/dnd` supports keyboard — wire it. Roadmap 2.8.
- **Effort:** M

### [HIGH] `as any` casts in `lib/api.ts` violate TS strict policy
- **Where:** `frontend/src/lib/api.ts` — automation rule `trigger`/`action` cast.
- **Impact:** CLAUDE.md explicitly forbids `as any`. When the backend schema evolves, these paths silently accept garbage.
- **Fix:** widen the type union or add a runtime guard. Remove the cast.
- **Effort:** S

### [MED] Dashboard uses `<Suspense fallback={null}>`
- **Where:** `frontend/src/app/dashboard/page.tsx:37`
- **Impact:** 2-3s of blank page on first load. Perceived-perf regression.
- **Fix:** build `<KanbanSkeleton />`, use it as fallback. Roadmap 1.11.
- **Effort:** M

### [MED] Dark mode hardcoded
- **Where:** `frontend/src/app/layout.tsx:74` (`<html className="... dark">`)
- **Impact:** light-mode OS users see forced dark UI. `next-themes` installed but unused.
- **Fix:** Roadmap 1.10. Wrap in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`.
- **Effort:** S

### [MED] Raw `<select>` without fixed height → mobile touch targets too small
- **Where:** dashboard Add Job form (lines 228, 249, 259, 302)
- **Fix:** add `h-10` minimum (44px), or swap to shadcn Select.
- **Effort:** S

### [MED] Eval score card uses 10-11px text
- **Where:** `frontend/src/components/resume/eval-score-card.tsx`
- **Impact:** at that size, even high-chroma text fails WCAG contrast against dark chip backgrounds.
- **Fix:** bump to `text-sm` (14px).
- **Effort:** S

### [MED] Toaster positioned top-center
- **Where:** `frontend/src/app/layout.tsx:84`
- **Impact:** overlaps the fixed header; clicks land on whichever wins the z-index race.
- **Fix:** move to `position="bottom-center"` or `"top-right"`.
- **Effort:** S

### [MED] Empty states don't guide next action
- **Where:** `frontend/src/app/jobs/page.tsx:77-80`
- **Impact:** "No jobs found" with no CTA → users bounce.
- **Fix:** suggest clearing filters, link to job import, or show sample jobs.
- **Effort:** S

### [LOW] Metadata title template leaves orphan separator
- **Where:** `frontend/src/app/layout.tsx:16` — `template: "%s · AutoAppli"` with no explicit per-page title falls back to `" · AutoAppli"`.
- **Fix:** set a `default` in metadata. Roadmap 2.6 addresses this more broadly.
- **Effort:** S

### [LOW] Focus-visible styling inconsistent
- **Where:** `frontend/src/components/ui/button.tsx`
- **Fix:** ensure `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` on all variants.
- **Effort:** S

### [LOW] No bundle-size audit
- No evidence of `@next/bundle-analyzer` run recently. Recharts, framer-motion, pdfjs all likely loaded eagerly. Dynamic-import the heavy ones.
- **Fix:** run analyzer, dynamic-import heavy libs.
- **Effort:** M

## Quick wins

Roadmap 0.6, 0.7, 1.10, and the grab-bag of S-effort items above. One sprint gets ~80% of the user-visible improvements.

## Strategic bets

- A11y pass (1.12) + kanban keyboard (2.8) together unlock a real WCAG claim.
- Light/dark theming unlocks the segment of users whose OS is set to light.
- Perceived-perf is the silent NPS killer — skeletons everywhere (1.11) then measure in Sentry.
