# Stream C — GoalTracker dashboard widget redesign

**Date:** 2026-04-25
**Scope:** `frontend/src/components/dashboard/goal-tracker.tsx` + new `_goal-tracker/` subcomponents
**Status:** DONE
**Visual direction:** Retro arcade scoreboard / CRT phosphor

---

## What changed

Total visual rewrite. Functional behaviour, props contract, storage layer, accessibility roles, and test hooks all preserved.

### Files modified
- `frontend/src/components/dashboard/goal-tracker.tsx` — rewrote 313 → 333 lines (heavy JSX + scoped fonts + date helpers stay co-located)
- `frontend/src/components/dashboard/goal-tracker.test.tsx` — added in-file `vi.mock("next/font/google")` (jsdom can't compile font loaders) + reverted streak `<span>` split that broke `getByText(/\d+-week streak/)`

### Files created (subcomponents)
- `frontend/src/components/dashboard/_goal-tracker/arcade-styles.ts` (59 lines) — shared CSSProperties for scanlines, vignette, phosphor glow, segments
- `frontend/src/components/dashboard/_goal-tracker/score-display.tsx` (88 lines) — dominant WK COUNT / TARGET readout + segmented LED bar (owns `role="progressbar"`)
- `frontend/src/components/dashboard/_goal-tracker/edit-goal-dialog.tsx` (97 lines) — arcade-skinned edit modal (owns `data-testid="goal-tracker-edit"`)

---

## Design decisions

**Typography (the punch).** Two Google Fonts pulled in via `next/font/google` at module top-level (Next 16 hard requirement). Variables are scoped to the widget root via the wrapping `<section>` className so `--font-arcade-digits` and `--font-arcade-label` don't leak into the rest of the app.
- `VT323` — chunky CRT terminal digit, applied to the giant week count, target, and streak number. Tabular-nums + leading-none → split-flap-display feel.
- `Share_Tech_Mono` — small-caps mono for every label. Wide letter-spacing (0.22em–0.32em) → arcade marquee voice ("SCORE / WK 01", "% LOADED", "HI-SCORE").

**Colour (breaks the dashboard uniformity).** Single high-saturation accent: CRT phosphor green `#00ff88`. No zinc-blue. Backdrop is straight `bg-zinc-950` (no card primitive — dropped because the shared Card component imposes the zinc-blue look the brief asked us to escape).

**Texture.**
- Scanlines via `repeating-linear-gradient` with `mix-blend-overlay` — sits over content but doesn't kill legibility
- Vignette via `inset box-shadow` — pulls focus to centre digits
- Top-edge phosphor gradient — single-pixel highlight along the bezel
- Multi-stop `text-shadow` on digits = phosphor bloom (6px / 14px / 28px)
- Segmented LED bar (10 cells) instead of a smooth progress bar — closer to actual arcade hardware

**Streak treatment.** Framed badge with phosphor border that lights up when the streak is active. The flame emoji from v1 stays (per spec) but is desaturated/dimmed when streak is 0 and gets a `drop-shadow(0 0 6px PHOSPHOR)` when active. "HI-SCORE" tag on the right (sm+ only) reinforces the arcade metaphor.

**Projection ticker.** Bottom row reads as a terminal echo: `>_ On pace to hit 100 apps by Jul 27, 2026`. Same mono label font, dimmed phosphor.

---

## Constraints respected

- No edits to `globals.css`, `app/layout.tsx`, `app/dashboard/page.tsx`, `components/ui/*`, or `lib/goals/storage.ts`
- Props interface unchanged (`{ jobs: Job[] }`)
- All `data-testid` and aria attributes preserved (`goal-tracker`, `goal-tracker-edit`, `role="region"`, `aria-labelledby`, `role="progressbar"` with `aria-valuenow/min/max`, dialog labels)
- Only animation is a `motion-safe:animate-pulse` on the power-dot — gated by `prefers-reduced-motion`
- `next/font` calls at module top-level (component file, not inside the function body)

---

## Verification

```
$ cd frontend && npx tsc --noEmit  → no goal-tracker errors (one pre-existing error in stories/page.tsx, unrelated)
$ cd frontend && npx vitest run goal-tracker  → 9/9 passed (910ms)
```

Test file edits were minimal:
1. Hoisted `vi.mock("next/font/google", () => ({ VT323: stub, Share_Tech_Mono: stub, ... }))` to make jsdom happy
2. Reverted a single `<span>` wrapping the streak number → kept the streak as a single text node so `getByText(/\d+-week streak/i)` still matches. The visual styling (glow, tabular-nums) is achieved on the parent `<p>` instead.

---

## Why this widget will be screenshotted

The dashboard's other widgets (ActionRadar, PipelineHealth, OutcomesBreakdown) all share the zinc-900 card / blue-300 icon / Inter sans-serif aesthetic. The redesigned GoalTracker breaks four conventions at once:
1. **Background:** pure black `bg-zinc-950` (vs zinc-900/60)
2. **Border:** emerald (vs zinc-800)
3. **Type:** monospace VT323 + Share Tech Mono (vs Inter sans)
4. **Accent:** phosphor green (vs blue-300/500)

Result: it reads as a different surface entirely — a high-score readout pinned to the dashboard. That's the reason a user screenshots it.

---

## Unresolved questions

- The `WK 01` label in the score header is hard-coded for v1. Future iteration could compute the user's nth week since `start_date` for a more personal readout.
- The flame emoji renders inconsistently across OS font stacks (Apple = colour, Windows old = monochrome). Could swap for an inline SVG in a follow-up to lock the look.
- Test file mock is duplicated knowledge (lists every font the widget might use). If more widgets adopt `next/font`, a global mock in `src/test-setup.ts` would DRY this up — but that file is out of scope here.

---

**Status:** DONE
**Summary:** GoalTracker redesigned as a retro arcade scoreboard with VT323 phosphor digits, segmented LED progress bar, scanline texture, and a framed streak badge — visually unmistakable against the rest of the zinc-blue dashboard. All 9 vitest specs pass, typecheck clean for the widget, accessibility roles + data-testids preserved.
**Concerns:** None blocking. Minor follow-ups noted above.
