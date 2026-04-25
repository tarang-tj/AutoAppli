# Stream B — `/stories` editorial archive

**Date:** 2026-04-25 · **Branch:** `fix/260425-slowapi-response-param`
**Scope:** Story Library page redesign as a deliberate aesthetic departure
from the dashboard. Cream-paper editorial archive, serif typography,
warm ink tones. Storage / wiring untouched.

## Aesthetic decisions

- **Family pairing:** **Lora** (transitional serif, full Latin support,
  excellent italics) for display + body editorial type. **Inter Tight**
  for UI chrome / metadata. **JetBrains Mono** for small-caps tag chips,
  page numbers, and masthead labels. All three loaded via
  `next/font/google`, scoped to the route via CSS variables on the
  layout wrapper so no other surface is affected.
- **Palette:** warm bone (`oklch(0.965 0.012 85)`) paper background;
  deep ink (`oklch(0.18 0.018 35)`) body type; muted ochre marker for
  highlight (`oklch(0.88 0.115 78 / 0.55)`); oxblood
  (`oklch(0.32 0.07 28)`) for active / hover accents. Single accent —
  no mixed signals.
- **Layout:** generous left/right margins via clamp, asymmetric two-
  column masthead, numbered "filed entries" with oldstyle figures in
  the gutter and dates rendered as masthead-style date plates.
- **Tags:** marker-highlight strikes via `box-decoration-break: clone`
  + linear-gradient pseudo-fill — survives line wraps the way a real
  highlighter would. NOT pill chips.
- **Empty state:** poetic — "An empty notebook. Start with a moment
  that taught you something." plus a hand-drawn dashed underline SVG.
- **Form:** "open a fresh page" — torn-edge top rule, paper texture,
  underline-only inputs (no boxed fields), serif body type for what the
  user is writing, mono labels for chrome.

## Hard constraints honored

- Did not touch: `app/layout.tsx`, `app/globals.css`, `components/ui/*`,
  `lib/stories/storage.ts`. All external read/write paths preserved.
- `useSyncExternalStore` wiring with `subscribeStories` /
  `getStoriesSnapshot` / `getStoriesServerSnapshot` retained.
- Writes still flow through `writeStory` / `deleteStory`.
- Form remains a hand-rolled dialog — focus trap (`useFocusTrap`),
  opener focus restore on unmount, Esc to close, backdrop dismiss.
- "n" hotkey wired in `page.tsx` (the previous version had it
  documented but unimplemented). Skips when typing or modal open;
  ignores modifier keys.
- Typecheck green: `cd frontend && npx tsc --noEmit` passes.
- Lint green on the stories surface.
- All files under 200 lines (largest = `story-card.tsx` at 181).

## File inventory

Modified:
- `frontend/src/app/stories/layout.tsx` (128 lines) — scoped fonts +
  cream canvas styles inline.
- `frontend/src/app/stories/page.tsx` (119 lines) — masthead, filed
  entries list, "n" hotkey.
- `frontend/src/components/stories/story-card.tsx` (181 lines).
- `frontend/src/components/stories/story-form.tsx` (164 lines).

Created (`frontend/src/app/stories/_components/`):
- `masthead.tsx` (111) — issue plate + display title + lead.
- `empty-state.tsx` (71) — first-run prompt.
- `dialog-shell.tsx` (78) — paper modal frame with torn-edge rule.
- `notebook-field.tsx` (77) — underline-only input/textarea + label.
- `notebook-field-row.tsx` (56) — STAR row presentation.
- `tag-picker.tsx` (65) — letterpress tag toggle row.
- `story-card-bits.tsx` (65) — TagInk, StarRow, EditorialLink.
- `story-form-internals.tsx` (123) — header / title / footer.
- `use-story-form-state.ts` (104) — draft state, validation, save.

## Notable implementation details

- Cream canvas overflows AppShell's `p-6` via negative margin so the
  paper bleeds to the chrome edges, then re-applies its own padding.
  Keeps the dashboard's dark theme intact everywhere else.
- SVG noise pattern via inline data-URI at ~6% opacity gives the paper
  grain — single round-trip, no external assets.
- `box-decoration-break: clone` on the `.ink-mark` class is the
  highlighter trick — gradient slices the y-axis so only the lower
  ~50% of the line is filled, mimicking a real marker stroke.
- Date in masthead read via `useSyncExternalStore` (server returns ""),
  avoiding hydration mismatch from server/client timezone differences
  AND React 19's `react-hooks/set-state-in-effect` lint rule.
- Story form's draft state, validation, and save call live in a
  custom hook (`useStoryFormState`) so the form file stays focused
  on layout / focus management.
- STAR rows are config-driven (an array map) so order is canonical
  S-T-A-R for screen-reader linear navigation and the JSX is compact.

## Functional changes

- `StoryCard` now receives an `index` prop (gutter numbering). The
  storage shape is unchanged.
- `EditorialLink` replaces the previous icon-button pattern for
  show/hide controls — feels editorial (italic + dotted underline) but
  remains a `<button aria-expanded aria-controls>` for semantics.
- "Map to questions" panel renders matched questions as italicized
  pull-quotes with a fleuron (❧) lead-in. "Hits" relabeled "Answers"
  to read like an editorial cross-reference.

## Status

**Status:** DONE
**Summary:** /stories ships an editorial archive aesthetic — Lora +
Inter Tight + JetBrains Mono on cream paper with marker-highlight
tags, oldstyle-figure entry numbers, and a "fresh page" form modal.
All storage, focus, and keyboard semantics preserved; "n" hotkey now
implemented. Typecheck and ESLint pass; every file under 200 lines.
**Concerns:** None — no commits made per instructions.

## Unresolved questions

- None.
