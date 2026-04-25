import { getSiteUrl } from "@/lib/site";

/**
 * /llms.txt — manifest per llmstxt.org spec.
 *
 * Plain-text Markdown that AI crawlers (Anthropic, OpenAI, Perplexity, etc.)
 * can ingest to understand AutoAppli's purpose and surface key URLs. Not
 * meant for sitemap inclusion — this is a separate convention from
 * sitemap.xml and robots.txt.
 *
 * Cache: 1 hour browser, 24 hours CDN. Force-static so Next emits a single
 * pre-rendered response at build time.
 */

export const dynamic = "force-static";

export async function GET() {
  const base = getSiteUrl();

  const body = `# AutoAppli

> Job-search workspace for college students. Find internships, tailor resumes and outreach with AI, track everything on a kanban. Built by a UW Bothell CS junior. Free during beta.

## Key pages

- [Home](${base}/): The main marketing surface — what AutoAppli does, who it's for, why "no auto-submit" matters.
- [Pricing](${base}/pricing): Free during beta. Core stays free for verified students.
- [About](${base}/about): Founder story; one CS student, a few hundred internship apps, a kanban that grew into a product.
- [Discover](${base}/discover): A live, deduplicated firehose of internship and new-grad jobs from public ATS feeds.
- [Comparisons](${base}/vs/lazyapply): Honest comparisons to LazyApply, Simplify, Huntr, Wonsulting, Teal.

## Blog

- [Why mass-applying tanks callback rate](${base}/blog/why-mass-applying-tanks-callback-rate): The math on why spray-and-pray hurts you.
- [Resume tailoring 101](${base}/blog/resume-tailoring-101): Three patterns that move callback rate.
- [Cold outreach that doesn't suck](${base}/blog/cold-outreach-that-doesnt-suck): Recruiter messaging that gets responses.
- [The internship recruiting calendar](${base}/blog/the-internship-recruiting-calendar): Month-by-month timing for student internship apps.
- [What recruiters actually look for in a CS internship resume](${base}/blog/what-recruiters-actually-look-for-in-a-cs-internship-resume): The 60-second rule and three patterns.
- [Answering 'why this company' without sounding fake](${base}/blog/answering-why-this-company-without-sounding-fake): Three angles that work, ranked.

## Free tools

- [Subject line tester](${base}/tools/subject-line-tester): Score your recruiter email subject line out of 10.
- [Resume keyword extractor](${base}/tools/resume-keyword-extractor): Paste a JD, get the top keywords ranked.

## Optional

- [Privacy](${base}/privacy)
- [Terms](${base}/terms)
- [GitHub](https://github.com/tarang-tj/AutoAppli)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
