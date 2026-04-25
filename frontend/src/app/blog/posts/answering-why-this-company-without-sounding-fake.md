---
title: "Answering 'Why This Company' Without Sounding Fake"
description: "Every student dreads the question and most answer it the same wrong way. Here's what works instead."
publishedAt: "2026-04-25"
readingMinutes: 7
---

It's the question every recruiter asks in the first five minutes of a phone screen and every student has rehearsed three answers for. "So — why are you interested in [Company]?"

Here's the typical answer:

> I'm really passionate about your mission and I'm super impressed by the innovative work your team is doing. I've always wanted to work at a company that values impact, and I think my background in software engineering would be a great fit.

This answer fails. It fails because every other candidate says some version of it, recruiters have heard the same words a thousand times, and "passionate about your mission" is the linguistic equivalent of a blank slot. You filled it with the company name to make it sound personal. The recruiter heard a slot.

The trap students fall into is thinking they need to flatter the company. They don't. Recruiters can hear flattery a mile away — it has a specific cadence, specific vocabulary ("passionate", "impressed", "innovative", "love what you're doing"), and signals nothing real. Worse: it signals you didn't do the work to find a real reason.

Here's the actual move.

## The frame: connect a real thing about them to a real thing you've done

A good answer to "why this company" has two halves connected by one verb.

> First half: a specific thing the company did that you actually noticed and have an opinion about.
> Second half: a thing you've worked on or thought about that connects to it.

The verb is whatever joins them honestly — "made me realize", "is something I've been wrestling with", "is the same problem I hit when".

This frame works because it's hard to fake. You can't bullshit your way through specificity. If you say "I read your engineering team's post on database sharding and the thing that stuck with me was the choice to shard by tenant_id rather than user_id", a recruiter knows immediately whether you actually read it — they'll ask one follow-up question and the answer will be obvious.

There are three angles, ranked by how much they land.

## Tier 1: Product specificity

Name a specific product, feature, or technical decision the company made and explain what it taught you about how they think.

> The thing that made me look closer at Linear was the keyboard shortcuts decision. Most issue trackers added shortcuts as a power-user feature. Linear made shortcuts the primary interface and built the mouse UI as the secondary. That's a strong product opinion and it told me the team is willing to pick a real trade-off and ship it. I want to work somewhere that does that.

This works because it's:
- Specific (keyboard shortcuts, not "the product")
- Opinionated (you have a take, not a compliment)
- Connected to a real reason (you want to work somewhere with strong product opinions)

The recruiter's follow-up will be "what other product decisions like that have you noticed?" and you should have one ready.

## Tier 2: Person specificity

Name a specific engineer or team and explain what their work signals about the engineering culture.

> I've been following Lin Clark's work on Wasm and your team hired her last year. That hire told me you're investing in people who think about platforms long-term, not just feature velocity. The infra-heavy take on platform engineering is exactly what I want to be around as a junior engineer.

This works for two reasons. First, recruiters love hearing that their engineering hires are visible — it makes recruiting easier. Second, naming a specific person proves you did real research; you can't pattern-match this.

The risk: don't name someone you only know about because of a recent press release. Pick someone whose work actually intersects with what you've done.

## Tier 3: Domain specificity

Connect a problem you've worked on (or studied) to a problem the company is solving.

> I built a small distributed cache for a class project last semester and the thing that surprised me most was how hard cache invalidation gets at scale — even at toy scale. Stripe's idempotency-key implementation is a problem in the same shape but at orders of magnitude more pressure. I want to see how that's solved at production scale and be near people who think about it day-to-day.

This works when your project is real and the connection is honest. It fails if you're stretching — recruiters can tell when the "domain" you claim to share with them is invented.

## The research minimum

You can't fake any of this. The minimum prep that makes a real answer possible:

- **30 minutes on the company's engineering blog.** Read the two most recent posts. Read one older deep-dive. Form an actual opinion about one of them.
- **15 minutes on the founders' or principal engineers' Twitter/LinkedIn.** Find one thread or talk that signals what they care about technically.
- **15 minutes on one recent product launch.** What did they ship in the last 6 months? What does that say about their priorities?

Total: 60 minutes per company. Done before the phone screen, not during.

This is a lot. It is also the only way to answer "why this company" non-trivially. Students who balk at 60 minutes per company are the same students who can't tell Stripe and Plaid apart in their interview answers. Recruiters can tell.

## A worked example: "why Stripe?"

**The bad answer (what most students give):**

> I'm really excited about Stripe because of the impact you're having on the global economy. Payments infrastructure is so important, and I think the work you're doing to enable internet businesses is incredible. I'd love to contribute to that mission as an intern.

This is six sentences saying nothing. The recruiter has heard exactly this three times today.

**The good answer:**

> Two things. First, I read the Stripe Sigma post when it came out and the thing that stuck with me was the decision to expose raw SQL to the customer instead of building a higher-level analytics UI. That's a strong opinion about who your customers are — engineers who want power, not marketers who want clicks. The second thing: I've been working on a side project that processes webhooks from third-party APIs, and the idempotency-key pattern Stripe popularized is exactly what saved me when I had a duplicate-event bug. So I've been on the receiving end of an opinion this team had about how payments APIs should work, and I want to work on the team that has those opinions.

Specific. Opinionated. Connected to your actual experience. The follow-up the recruiter asks ("which other API design decisions of ours have you noticed?") is a question you can answer because the prep is real.

## One trap to avoid

Don't open with the company's mission statement quoted back to them. They wrote it. They know it. Reciting it to them sounds like flattery and the conversation starts on the wrong foot.

Same with "I love what you're doing in [vague space]." Same with "I admire [Company] for being a leader in [industry]." These phrases are tells. Recruiters pattern-match them and adjust expectations downward.

## The brand-aligned takeaway

A tailored resume takes 10-30 minutes per application. Researching a company well enough to answer "why this company" honestly takes 60 minutes. AutoAppli automates the resume; the company research is the part you have to do yourself.

The good news: the research compounds. The 60 minutes you spend on Stripe also pays off when Plaid asks the same question, because you now have a frame for thinking about payments-infra companies. By the third or fourth phone screen, the prep cost per company drops because the mental model carries over.

Send fewer applications, prep deeper for each one, and stop reciting mission statements. The phone screens get easier almost immediately.
