# AutoAppli Development Roadmap

Living doc. Updated when phase status changes, not on a fixed cadence. Keep this short: if it grows past one page, split by quarter into separate files.

**Last reviewed:** 2026-04-24
**Current phase:** Q2 2026 — Launch prep

## North star

Become the default job-search workspace for CS students running internship and new-grad cycles. Measured by: recurring users at peak recruiting season (Sept–Nov and Jan–Mar), not by raw signup count.

## Calendar context (why quarters matter for this product)

Internship recruiting is seasonal. Product and marketing plans should ride the cycle, not fight it.

| Quarter   | Student context                         | Implication for AutoAppli                                      |
| --------- | --------------------------------------- | -------------------------------------------------------------- |
| Q2 (Apr–Jun) | Spring term ending, summer internships starting | Build window. Users busy. Time for refactors, marketing prep.  |
| Q3 (Jul–Sep) | Summer internship in progress, fall recruiting starts early Sept | Launch window. Warm the pipeline before peak.                  |
| Q4 (Oct–Dec) | Peak internship recruiting (Sept–Nov). Finals. | Scale window. Product must not break. Support responsive. New features only if surgical. |
| Q1 (Jan–Mar) | New-grad recruiting. Spring internships close out. | Second launch window. Validate retention from Q4 cohort.       |

## Current phase — Q2 2026 (Apr–Jun): Launch prep

**Goal:** product surface and marketing surface ready for Sept intern-season traffic.

- [x] Match v2 structured scoring shipped (Phase A2)
- [x] Live multi-source search via cached_jobs firehose (Phase A1)
- [x] Backend CI + perf indexes (Phase B4 + A4)
- [x] Anthropic prompt caching flag (Phase B3)
- [x] AI route auth + rate limiting (Phase B1 + B2)
- [x] Landing page rewrite for student wedge + Vercel Analytics (#3, merged 2026-04-24)
- [x] `CLAUDE.md` + `docs/brand-guidelines.md` docs sync (this PR)
- [x] Frontend CI (typecheck blocking, lint advisory) (this PR)
- [ ] Repo hygiene: remove tracked scaffolding scripts and patches at root
- [ ] Frontend lint sweep: reduce the 20 pre-existing violations so CI can flip lint to blocking
- [ ] First public launch post: r/csMajors (target: end of May, before finals)
- [ ] Set up basic signup UTM tracking for Reddit/HN inbound

## Next — Q3 2026 (Jul–Sep): Warm the pipeline before peak

**Goal:** have 100+ students using the product and 2–3 testimonials before Sept recruiting kicks off.

- [ ] r/cscareerquestions follow-up post
- [ ] Discord server or similar community surface for early users
- [ ] Case-study page with 2–3 real student outcomes (first-name + school + year)
- [ ] Chrome extension store listing (currently loaded unpacked)
- [ ] Match-v2 recall validation against real applied-then-offered dataset
- [ ] Extension support for a 6th ATS (Workday is partially there; decide: Workday full support, or Pymetrics / Eightfold)
- [ ] Signup funnel analytics: landing → signup → first saved job → first applied

## Peak — Q4 2026 (Oct–Dec): Do not break

**Goal:** support the users already on the product through peak season. Resist feature sprawl.

- [ ] Weekly manual support window (office hours in Discord, 1 hour per week)
- [ ] Stability: alerting on backend error rate + live_search availability
- [ ] Performance: kanban latency stays under 100ms at 500-card boards
- [ ] Interview-prep surface polish if users are actually reaching interview stage
- [ ] Data backup verification (Supabase PITR sanity check before November)

## Follow-on — Q1 2027 (Jan–Mar): New-grad + retention

**Goal:** validate that the Q4 cohort sticks for new-grad recruiting. Either product has retention or positioning needs to shift.

- [ ] Retention cohort analysis on Q4 users
- [ ] New-grad-specific FAQ and landing variant
- [ ] First paid feature decision (only if the audit shows clear willingness-to-pay signal)

## Out of scope — do not drift into

These show up as "should we also" questions but each one dilutes the student wedge. Default answer: no, not this cycle.

- Generic mid-career job search
- LinkedIn spam / auto-connect
- Mass auto-apply (contradicts our entire positioning)
- Non-US/CA job boards
- Mobile app (responsive web is enough for the kanban use case)
- Team / employer-side workspaces

## Success metrics (what to actually watch)

- **Primary:** recurring user count during Sept–Nov recruiting peak
- **Secondary:** number of applications with tailored resume (indicator of real use vs drive-by signup)
- **Tertiary:** testimonial pull rate — what fraction of active users will publicly say something nice when asked

## How this doc stays current

- Update checkboxes in-line as work lands. Don't delete completed items — historical record matters.
- Add a dated note under `Last reviewed:` when major changes happen.
- When a quarter completes, either (a) retire the section and link to a git history reference, or (b) leave it and start the next quarter's block.
