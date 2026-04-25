# Stream A — `/interview/mock` Theatrical Redesign

**Agent:** ui-ux-designer
**Date:** 2026-04-25
**Branch:** `fix/260425-slowapi-response-param`
**Status:** DONE

## What shipped

A full visual rewrite of the AI Mock Interview surface around a **Theatrical Spotlight** metaphor. The interview is staged as a performance: the user steps under a warm amber spotlight on a near-black stage, the AI question is set in oversized italic Fraunces serif, the user types their answer in JetBrains Mono so the dialogue reads like a script being typed live, and the final scorecard is presented as a curtain-call critic's review with marquee-sized tabular numerals.

Functionality is preserved end-to-end: same `startSession` / `submitTurn` / `endSession` API calls, same 3-stage flow (`setup` → `active` → `complete`), same `data-testid` hooks for Playwright (`mock-start`, `mock-submit-answer`, `mock-end-summary`), same accessibility (ARIA labels, focus management, role="progressbar", `aria-live` for the question, keyboard submit via Cmd+Enter, 16px input font to avoid mobile zoom).

## Aesthetic decisions

| Decision | Rationale |
|---|---|
| **Palette** scoped to this surface only: deep ink (`oklch(0.085 0.014 268)`), bone (`oklch(0.965 0.014 78)`), ember (`oklch(0.78 0.16 65)`), velvet (`oklch(0.18 0.04 18)`) | Warm amber-on-near-black reads as theater spotlight on a dim stage. Distinct from the rest of the app's zinc-blue without polluting global tokens. |
| **Type pairing** Fraunces (display, italic) + JetBrains Mono (body/UI), scoped via `next/font/google` in route-segment `layout.tsx` | Fraunces' characterful italic gives the AI question dialogue weight. Mono for the user side makes it feel like a live script. Inter/Sora are confined to the rest of the app per spec. |
| **Spotlight** rendered as 4 stacked layers: cool ambient rim from above, hot warm radial center bloom (`mix-blend-mode: screen`), velvet floor vignette, SVG film-grain noise overlay | No images, no JS animation — pure CSS gradients + inline SVG noise data URI. Ambient layer is always on; the hot bloom intensifies during the active stage via the `spotlightHot` prop. |
| **Curtain edges** vertical ribbed velvet panels at left/right viewport edges, hidden under `lg:` | Frames the action like stage curtains without breaking mobile breathing room. |
| **Filmstrip progress bar** 20-segment ticker tape replaces a fluid percentage bar | Reads as celluloid frames advancing — reinforces the cinematic metaphor and renders cleanly at every question count (3/5/7). |
| **Drop-cap** on the active AI question, oversized ember serif glyph | Theatrical/editorial flourish — instantly signals "this is the line you're delivering." |
| **CTA buttons** ember gradient with letter-spacing animation on hover (`tracking-[0.22em]` → `tracking-[0.28em]`) | Subtle "the marquee bulbs flicker brighter" feel. No glow / neon, no cliched glassmorphism. |
| **Marquee scorecard** 9rem display-serif tabular numeral, dual text-shadow (ember bloom + velvet drop) | Reads as theater marquee letters. Five ember stars derived from the 100-pt overall give an at-a-glance read. |
| **Critic's review cards** strengths in italic ember + ✦ symbol, improvements in italic bone + → symbol | Replaces the generic green/amber-card pattern. Reads like printed reviews. |
| **Copy** uses theater vocabulary throughout: "Step under the spotlight", "Take 001", "Casting", "Run time", "Raise the curtain", "Curtain call", "Critic's Read", "Notes from the director", "Run it again" | Carries the metaphor into voice. Banned phrasing ("apply for you" etc.) confirmed absent — surface is explicit it's a practice space. |

## Files touched

All under `frontend/src/app/interview/mock/`. No shared files modified.

| File | Lines | Role |
|---|---:|---|
| `layout.tsx` (NEW) | 46 | Route-segment layout — scopes Fraunces + JetBrains Mono via `next/font/google`. Sets per-page `<title>`. |
| `page.tsx` (modified, was 24) | 43 | Suspense wrapper + theme-matched fallback ("Lights coming up…") instead of generic zinc skeleton. |
| `mock-interview-ui.tsx` (rewritten, was 485) | 177 | State machine + API I/O orchestrator. All presentation moved to subcomponents. |
| `_components/stage-atmosphere.tsx` (NEW) | 185 | `<StageBackdrop>` + `<CurtainEdge>` + `<FilmGrainSvg>` — owns the four spotlight layers, scoped CSS tokens, curtain edges. |
| `_components/call-sheet-header.tsx` (NEW) | 49 | Eyebrow + title + subhead for setup. |
| `_components/call-sheet-stage.tsx` (NEW) | 175 | Setup form composition — JD textarea, Casting + Run time selects, Raise-the-curtain CTA. |
| `_components/stage-form-fields.tsx` (NEW) | 128 | `<SelectField>` + `<TextareaField>` primitives — hand-built (not shadcn) so they carry the inset-velvet shadow + ember focus ring. |
| `_components/spotlight-stage.tsx` (NEW) | 176 | Active interview composition — filmstrip progress, dimmed history reel, drop-cap question, answer composer mount. |
| `_components/dialogue-line.tsx` (NEW) | 66 | `<DropCapText>` + `<ScriptLine>` for past exchanges. |
| `_components/answer-composer.tsx` (NEW) | 95 | The mono answer textarea + Cmd+Enter hint + Deliver button. |
| `_components/curtain-call-stage.tsx` (NEW) | 189 | Scorecard composition — marquee number, dimensions list, two review cards, actions. |
| `_components/scorecard-primitives.tsx` (NEW) | 141 | `<Stars>`, `<DimensionRow>` (20-segment ticker meter), `<ReviewCard>`. |
| **Total** | **1,470** | |

Every code file under 200 lines. No file outside `frontend/src/app/interview/mock/` was touched. Shared shadcn primitives (`button.tsx`, `card.tsx`, etc.) are intentionally not used in this surface — the route uses hand-built dimensional surfaces so the aesthetic isn't "shadcn-on-zinc with different colors."

## Validation

- `cd frontend && npx tsc --noEmit` → exit 0
- `cd frontend && npx eslint src/app/interview/mock/ --max-warnings 0` → exit 0
- All `data-testid` hooks preserved at correct DOM nodes.
- All ARIA roles/labels preserved (`role="alert"`, `role="progressbar"` with `aria-valuenow/min/max/label`, `aria-live="polite"` on question, `aria-busy` on submitting buttons, `aria-label` on textareas).
- Mobile-first: all type/spacing scales sm:/lg: upward; curtain edges hidden under `lg:`; input `font-size: 16px` to prevent iOS zoom; touch targets ≥ 44px on CTAs.
- Color contrast: bone (`oklch 0.965`) on ink-deep (`oklch 0.085`) is well above 4.5:1. Ember CTA text uses ink-deep against the ember gradient (high contrast). Dimmed bone-dim used only for de-emphasized secondary text.

## Open questions

1. **Reduced motion** — The CSS effects are static (gradients, opacity). The only motion is the pulsing ember dot in the eyebrow row (`animate-pulse`) and a 500ms transition on the filmstrip progress fill. Both are subtle and unlikely to trigger vestibular issues, but a dedicated `@media (prefers-reduced-motion)` block could be added if the team wants belt-and-suspenders.
2. **Scoped CSS tokens** are currently injected via inline `style={{}}` on the `<StageBackdrop>` div by parsing a JS constant. Works, but if globals.css evolution is OK in a future PR, promoting `--stage-*` tokens there would slightly cleaner. Kept inline this round to honor the "do not touch globals.css" constraint.
3. **Empty-state for `top_strengths` / `top_improvements`** is rendered as `— no notes —` in mono. Backend currently always returns at least one item; if that contract changes the placeholder will surface. Acceptable.
4. **Font subset** — Fraunces and JetBrains Mono are loaded with `subsets: ["latin"]` only. If the surface ever needs Vietnamese, both fonts support it but `vietnamese` would need to be added to the subsets array.

---

**Status:** DONE
**Summary:** Replaced the generic zinc/blue chat UI with a theatrical-spotlight aesthetic — deep ink + warm ember palette, Fraunces serif for AI dialogue, JetBrains Mono for the user side, layered radial-gradient spotlight with film-grain overlay, filmstrip progress, and a marquee-sized curtain-call scorecard. All API I/O, test IDs, accessibility, and the 3-stage flow preserved. 12 files, all under 200 lines, typecheck and lint clean.
**Concerns:** None blocking. Optional polish items listed under Open questions.
