# Landing Page Rewrite Spec

Target file: `frontend/src/components/marketing/landing-page.tsx` (726 lines, 9 sections).
Frame: student-wedge, "prepare not submit" honest positioning, concrete numbers, no em dashes, no corporate SaaS verbs.

Current hero reads generic SaaS ("Your entire job search, one workspace"). This spec keeps the 9-section structure so the rewrite is one file's worth of copy edits, not an architectural change.

---

## Global metadata (do this while you're in there)

**`frontend/src/app/layout.tsx`:**

- Title: `AutoAppli — Job-search workspace for students`
- Template: `%s · AutoAppli` (unchanged)
- Description: `Find internships from Greenhouse, Lever, Ashby, and more. Tailor your resume in 30 seconds. Track everything on a kanban. You still hit apply. Free for students.`
- Keep OG + JSON-LD structure; update OG title to match.

**Add analytics.** `npm i @vercel/analytics`, drop `<Analytics />` from `@vercel/analytics/next` inside `<body>` after `<Toaster />`. Zero config, free on Vercel, ships with UTM support so the Reddit launch becomes legible.

---

## Section 1 — Hero

Replace the current hero inside `landing-page.tsx` around lines 110-179.

**Pill (above H1):**
`Built by a UW Bothell CS junior who ran the grind`
(Keep the Sparkles icon. Drop "AI-powered job search, built for 2026" — it's empty.)

**H1:**
`The internship grind, minus the tab chaos.`

Keep the gradient span on `minus the tab chaos` to preserve the visual treatment. If you want the old two-line feel, alternate:
`Find internships. Tailor resumes. Track everything.`
with the gradient span on `Track everything`.

**Subhead:**
`AutoAppli pulls live jobs from Greenhouse, Lever, Ashby, Indeed and LinkedIn, tailors your resume to the JD in about 30 seconds, and tracks every application on a kanban. We don't auto-submit and we don't spray. You still click apply. That's the point.`

(This single paragraph does three jobs: establishes the actual feature set, flags real ATS sources, and plants the anti-LazyApply differentiator above the fold.)

**Primary CTA:** `Start your internship board` (replaces "Get started free" — more specific, more audience-specific).

**Secondary CTA:** `Try it without signup` (keeps TryDemoButton).

**Check row under CTAs (replace the three):**
- `Free for students`
- `No credit card`
- `You stay in control. We never click apply for you.`

---

## Section 2 — Trust bar

Keep the structure. Swap "Sources supported" header to `Pulls jobs from` and keep `LinkedIn · Indeed · Greenhouse · Lever · Ashby`. Consider appending `Workday` since extension manifests already include it.

---

## Section 3 — App preview

Keep the screenshot/kanban mock (whatever's in `AppPreview`). If the caption is generic, use:

`This is the kanban. Every saved job becomes a card. Every card remembers the JD, the resume you tailored, the outreach you drafted, and when you hit apply.`

---

## Section 4 — How it works

Replace whatever icon+copy combo exists with a 4-step flow that mirrors the actual code paths:

| Step | Heading | Copy |
|------|---------|------|
| 1 | **Find** | `Live search pulls from the company ATS boards students actually apply through. Save from LinkedIn with the Chrome extension in one click.` |
| 2 | **Tailor** | `Point AutoAppli at a JD. It drafts a resume version that matches, plus a cover letter, plus a recruiter outreach message. Thirty seconds. You edit it.` |
| 3 | **Apply (you)** | `Open the company's apply page. Paste, check, submit. We don't do this part on purpose. Recruiters can tell when a tool did.` |
| 4 | **Track** | `Card moves down the kanban. Automation flips statuses when you mark applied, schedule an interview, or get ghosted for 14 days.` |

The "Apply (you)" step is the load-bearing one. Don't soften it. The honesty is the product.

---

## Section 5 — Feature grid

Replace generic icon+label cards. Order by "what a UW Bothell CS junior cares about during recruiting season":

1. **Resume tailoring** — "Paste the JD. Get a resume version tuned to it. Matches skills, keywords, seniority. ~30s per role."
2. **Live job search** — "Firehose pulls from Greenhouse, Lever, Ashby. Deduped, matched against your profile, ranked."
3. **Chrome extension** — "Save from LinkedIn or any ATS page. One click. No manual data entry. Read-only. Doesn't touch the company's forms."
4. **Cover letters** — "Generated against the JD, not a template. Edit the draft, don't start from blank."
5. **Outreach drafts** — "Recruiter DM drafts that sound like a student, not a sales email."
6. **Kanban tracker** — "Every card carries its JD, resume version, cover letter, outreach, applied-at timestamp. Mobile-snap."
7. **Interview practice** — "Prep mode with a Claude backend. PII-redacted by default."
8. **Salary lookups** — "So you don't take the first number."
9. **Match scoring** — "Seven-signal explainable score. Hover for breakdown. Not a black box."

(If 9 is too many, drop 7–9 first. Keep 1–3 for sure.)

---

## Section 6 — Metrics (the "Why it works" section)

**Only ship numbers you can back up.** Suggested replacements if the current version leans on made-up stats:

- `1 click to save a job from any supported board`
- `~30s to a tailored resume draft`
- `0 applications auto-submitted — by design`
- `Free forever for students` (if actually true under current pricing)

One metric must be the "zero auto-submits." Frame it as a feature, not an apology. Use a shield icon.

---

## Section 7 — Testimonial

If you don't have a real student quote yet, **do not invent one.** Options:

1. Replace with a founder-voice quote block:
   > `"I applied to about 400 internships last cycle. Most of the ones that actually became offers were the ones where I had time to tailor my resume — not the ones where I copy-pasted. Built AutoAppli so next year's me spends that time on the roles that matter."`
   > — Tarang, UW Bothell CS '27, AutoAppli founder

2. Hide the section entirely until you have real quotes. Better than fake.

When you get Reddit/Discord quotes, put real first names + school + year under them. "Maya, UIUC CS '26" beats "Senior Engineer at Company X."

---

## Section 8 — FAQ

Add these three to whatever FAQ already exists. The first one is non-negotiable because 80% of the market now assumes "job automation = LazyApply."

**Q: Does AutoAppli auto-apply for me?**
A: `No. On purpose. AutoAppli doesn't submit applications, doesn't fill forms, doesn't click apply buttons. Recruiters can tell when a tool did it and it tanks your callback rate. What we do: find the role, tailor your resume and cover letter to it, track it. You open the apply page and submit yourself. We set up the ten minutes of work that matters; we don't try to fake the last thirty seconds.`

**Q: Why "for students" specifically?**
A: `I built this while doing my own internship search as a junior at UW Bothell. Internship recruiting has a cycle (Sept–Nov for next summer, Jan–Mar for new-grad) and a different rhythm than mid-career search. AutoAppli is tuned for that. Other audiences are welcome; the defaults are set for students.`

**Q: How is this different from LazyApply / Simplify / Huntr?**
A: `LazyApply submits for you. We don't. Simplify autofills any role for any user; we're vertical on student internship and new-grad. Huntr is a tracker only; we do the prep work (resume tailor, cover letter, outreach) plus tracking. If what you want is to mass-fire 500 applications tonight, we are not the tool.`

(Keep any existing FAQs about pricing, data privacy, etc.)

---

## Section 9 — Final CTA

**H2:** `Recruiting season's already started somewhere. Get your board set up.`

**CTA button:** `Start your internship board` (matches hero)

**Supporting line under CTA:** `Free for students. No credit card. Thirty seconds to first saved job.`

Drop any "Join 1000+ users" type social proof unless the number is real.

---

## What to remove from current landing

- "AI-powered job search, built for 2026" pill (empty)
- "Your entire job search, one workspace" H1 (corporate)
- "one workspace" frame (replace with "board" / "kanban" — more specific)
- Any reference to "seamless," "streamline," "unlock," "empower" (audit the full 726 lines for these)
- Generic AI badges/icons that don't tie to a shipped feature

## Scope / effort

Full landing rewrite + analytics wiring, one PR:

- `landing-page.tsx` copy edits: ~3h (most of the work is ctrl-F replacements of the 9 sections above)
- `layout.tsx` metadata + `@vercel/analytics`: ~20min
- Screenshot/video capture for the `AppPreview` section if current one is stale: ~30min
- QA pass on mobile (kanban mobile-snap was recent so this is already warm): ~30min

Total: 4–5h. Matches the priority 3 estimate from the earlier audit.

## Before merging, sanity check

1. Grep the file for `apply` as a verb with AutoAppli as subject. Should return zero hits.
2. Grep for `em dash` characters. Zero hits.
3. Grep the banned verb list (`empower`, `streamline`, `seamless`, `unlock`, `leverage`, `elevate`). Zero hits.
4. Open `/` in Chrome mobile emulator. H1 readable without scroll on iPhone SE width.
5. Vercel Analytics shows up in prod deploys (check Vercel dashboard post-deploy).

## Unresolved questions

- Is "400 applications last cycle" an accurate personal number? If it's actually 200 or 600, use the real number. Real beats round.
- Current pricing: is there actually a "Free forever for students" tier, or is everything currently free while pre-monetization? Word the free-tier claim to match reality.
- Does the existing `AppPreview` section show real product screenshots or placeholder? If placeholder, that's a separate (and more important) issue than copy.
