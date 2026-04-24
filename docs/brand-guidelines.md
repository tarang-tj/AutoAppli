# AutoAppli Brand Guidelines

One-page reference for anyone (or any agent) writing AutoAppli copy: landing, emails, social, docs, ads, reply DMs. Update when positioning shifts, not when taste shifts.

## What AutoAppli is (and isn't) — read first

**Is:** a job-search workspace. Finds roles (live search + Chrome extension + ATS firehose), prepares applications (AI resume tailor, cover letter, outreach draft), tracks everything on a kanban. Helps students spend their time on the 10 apps that matter instead of losing it to tab-juggling.

**Is not:** an auto-submitter. We do not click apply for the user. We do not fill ATS forms. We do not mass-fire applications. The user manually clicks apply on the company's own page. Then we track the outcome.

This distinction is load-bearing. It is our single biggest differentiator from LazyApply and the spray-and-pray tools, and it maps to what the code actually does (read-only extension, no browser automation, no form filling anywhere in the stack). Copy that implies auto-submission is wrong on the facts and weakens the position. When in doubt, use verbs like "find," "tailor," "draft," "track" — not "apply," "submit," "send."

## Who this is for

College students running the internship and new-grad grind. Specifically the people doing it seriously: 100+ apps a cycle, tracking in spreadsheets, refreshing Greenhouse at 2am, tailoring resumes per role. Not casual browsers, not mid-career switchers, not executives.

## Positioning

**Built by a student who ran the internship grind, for students running it now.**

The whole product is downstream of that sentence. Every feature should read like something the founder needed during a real cycle, not a generic productivity play.

One-liner options for different surfaces (all avoid "auto-apply" framing):

- **Short:** "The internship grind, minus the tab chaos."
- **Landing hero:** "Spent 400 hours on internship applications last cycle. Built AutoAppli so you spend those hours on the ones worth applying to."
- **Meta / OG:** "Find internships, tailor your resume in 30s, track everything on a kanban. You still hit apply."
- **Twitter bio style:** "Job-search workspace for CS students. No mass-apply nonsense."

Use concrete numbers. Avoid vague claims about "saving time."

## Voice

Casual. Specific. Human. Student-to-student, not SaaS-to-lead.

**Sounds like:** a friend who stayed up last night filling out Workday forms, telling you about a shortcut.

**Does not sound like:** a pitch deck, a Series A announcement, or a LinkedIn thought leader.

### Rules

1. **No em dashes.** Use periods, commas, or parentheses. Em dashes are an LLM tell and undercut the "real student built this" positioning.
2. **No corporate verbs.** Ban: empower, unlock, streamline, seamlessly, leverage, elevate, supercharge, transform, revolutionize.
3. **Specifics beat abstractions.** "Applied to 47 Greenhouse roles in 6 minutes" > "boost your application throughput."
4. **Short sentences win.** If a sentence has two commas and a conjunction, break it.
5. **First person is allowed** when the founder is speaking. "I built this because…" is fine and often stronger than third person.
6. **Occasional mild self-deprecation is on-brand.** "Yeah, I got ghosted by Amazon too."
7. **Numbers, not adjectives.** Not "fast" — "2s per application." Not "accurate" — "matched 23 of 25 roles I actually applied to."

### Anti-samples (do not ship)

- "Empower your job search with cutting-edge AI."
- "Seamlessly streamline your application pipeline — unlock new opportunities."
- "The future of hiring is here."

### On-brand samples

- "Save a job from LinkedIn. Kanban tracks it. Resume tailors to the JD. You hit apply. That's it."
- "It scrapes Greenhouse so you don't have to open 40 tabs at 1am."
- "I ran 400 apps last cycle. Built this so next year's me doesn't have to."
- "Find, tailor, track. We don't push the button for you, and we think that's the point."
- "Not LazyApply. We don't mass-fire submissions. Recruiters can tell when you do, and so can we."

## Anti-positioning (what we are not)

We are not:

- **LazyApply.** Not a mass-apply spray-and-pray tool. We literally do not submit applications. The extension is read-only, the backend has zero browser-automation code. The user clicks apply on the company's own site. This is a deliberate design choice, not a missing feature, and it is the cleanest differentiator we have. Lean on it.
- **Simplify.** Not a general autofill extension for anyone looking for work. We are vertical on student internship and new-grad.
- **Teal / Huntr.** Not a generic pretty tracker. The autofill, scraping, match, and extension work together because we designed for one user flow.
- **LinkedIn Premium.** Not a paid-surface discovery tool. We pull from the actual ATS firehose (Greenhouse, Lever, Ashby, Workday).
- **A career coach.** We do not give generic advice. We do the mechanical work so students can focus on the 10 apps that matter.

When asked "how are you different from X," answer with a mechanic, not a claim. "LazyApply mass-fires submits on your behalf. We don't. We pull directly from company ATS boards, match against your actual resume, and give you a tailored resume plus cover letter before you hit apply yourself."

## Audience wedge (keep tight)

**Primary:** CS / engineering / product undergrads at universities with active recruiting cycles (UW, Purdue, UIUC, UT Austin, GTech, UMich, Waterloo, UBC, similar). Summer internship + new-grad full-time.

**Secondary (later, not now):** Students in business / finance / consulting with structured recruiting. MBA recruiting.

**Out of scope (for now):** Mid-career switchers. Non-technical senior roles. International job boards outside US/CA. Contract / freelance.

Staying tight on the wedge is a feature, not a limitation. Every "should we also support X" question should default to no until the student internship cycle is dominated.

## Proof formats that work

- Founder-voice tweets from the actual grind ("did 87 apps today, screenshots attached").
- Screen recordings showing real Greenhouse / Workday boards getting scraped and matched.
- Per-school numbers. "12 UW students landed FAANG offers using AutoAppli this cycle."
- Specific company lists, not logo walls. "Jobs surfaced from Anthropic, Figma, Ramp, Scale, Mercor this week."

## Do not ship copy that

- Opens with "Introducing…" or "We're excited to announce."
- Uses "the only platform that…" or "the #1 tool for…"
- Promises a number you can't back up with a screenshot.
- Compares to ChatGPT ("ChatGPT for jobs," "ChatGPT but for applications"). Lazy shorthand, not a position.
- Reads like it could be any SaaS. If you could swap the product name and it still works, rewrite.
- Implies AutoAppli auto-submits, auto-applies, fills forms, or clicks apply buttons. It does not. Using "auto-apply," "applies for you," "submits applications," or similar verbs is factually wrong and legally iffy. Verbs we use: find, tailor, draft, match, track. Verbs we don't: apply (as a transitive verb with us as the subject), submit, send, fire, fill.

## Quick self-check before publishing

1. Does it sound like a student wrote it? (If not, rewrite.)
2. Is there a concrete number, screenshot, or named company? (If not, add one.)
3. Any em dashes? (Remove.)
4. Any banned corporate verbs? (Remove.)
5. Does any sentence imply AutoAppli submits applications, auto-fills, or clicks apply? (If yes, rewrite. It's false and it's our biggest position-wreckage risk.)
6. Would a UW Bothell junior screenshot this and send it to their friends? (That's the bar.)
