import type { Metadata } from "next";
import {
  ComparisonPage,
  type ComparisonRow,
  type FaqItem,
} from "@/components/marketing/comparison-page";

export const metadata: Metadata = {
  title: "AutoAppli vs Wonsulting — for students",
  description:
    "Looking for a Wonsulting alternative? AutoAppli ships software-only AI prep, a kanban tracker, and a live multi-source job firehose. No coaching marketplace, no auto-submit. Honest comparison for students.",
  keywords: [
    "wonsulting alternative",
    "wonsulting vs autoappli",
    "wonsultingai alternative",
    "student internship tracker",
    "ai resume tool for first-gen students",
  ],
  alternates: {
    canonical: "/vs/wonsulting",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "article",
    title: "AutoAppli vs Wonsulting — for students",
    description:
      "Wonsulting pairs AI tools with human coaching and an AutoApply queue. AutoAppli is software-only, no auto-submit, tuned for the student internship cycle. Compare the two honestly.",
    url: "/vs/wonsulting",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAppli vs Wonsulting — for students",
    description:
      "Honest comparison: Wonsulting bundles AI plus 1:1 coaching plus AutoApply. AutoAppli is the software-only, callback-rate-first option for students.",
  },
};

const ROWS: ComparisonRow[] = [
  {
    feature: "Auto-submits applications for you",
    note: "Sends the application to the company on your behalf, with or without per-role review.",
    autoappli: "no",
    autoappliNote: "By design. No browser-automation libs in the codebase.",
    competitor: "partial",
    competitorNote: "AutoApply queues, drafts, and submits roles it can fully automate; you review the resume and cover letter before it fires.",
  },
  {
    feature: "Resume tailoring per JD",
    note: "A fresh resume tuned to this specific listing.",
    autoappli: "yes",
    autoappliNote: "Claude-backed, ~30 seconds, you edit.",
    competitor: "yes",
    competitorNote: "ResumAI rewrites bullets into accomplishment statements with a resume score.",
  },
  {
    feature: "Cover letter generator",
    autoappli: "yes",
    autoappliNote: "Drafted from the JD, not a template.",
    competitor: "yes",
    competitorNote: "CoverLetterAI; free tier limited to 3 letters total.",
  },
  {
    feature: "Recruiter outreach drafts",
    note: "Cold DMs that sound like a student, not a sales blast.",
    autoappli: "yes",
    competitor: "yes",
    competitorNote: "NetworkAI finds verified contacts and drafts the message; free tier capped at 3.",
  },
  {
    feature: "Interview prep",
    autoappli: "yes",
    autoappliNote: "Likely questions, talking points, company overview.",
    competitor: "yes",
    competitorNote: "InterviewAI runs role-specific simulations with feedback; free tier is 1 session.",
  },
  {
    feature: "Kanban application tracker",
    autoappli: "yes",
    autoappliNote: "Mobile-snap kanban with the JD, resume version, cover letter, outreach, timestamp on every card.",
    competitor: "partial",
    competitorNote: "JobTrackerAI tracks applications but is more list-style than drag-and-drop kanban.",
  },
  {
    feature: "Browser extension",
    autoappli: "yes",
    autoappliNote: "Read-only saving across LinkedIn, Greenhouse, Lever, Ashby, Indeed, Workday.",
    competitor: "no",
    competitorNote: "No Chrome extension advertised; saving and tracking happen inside JobBoardAI.",
  },
  {
    feature: "Free tier",
    autoappli: "yes",
    autoappliNote: "Free demo while we're building. Core stays free for verified students.",
    competitor: "partial",
    competitorNote: "Free tools exist but limits are tight: 3 cover letters total, 30 jobs tracked, 1 interview prep session.",
  },
  {
    feature: "Student-specific tuning",
    note: "Internship cycle defaults, new-grad recruiting calendar, course-aware matching.",
    autoappli: "yes",
    autoappliNote: "Built by a CS junior for the Sept-Nov internship rush.",
    competitor: "partial",
    competitorNote: "Has a Students/Recent Grads service tier and content for early-career, but the AI product is general-audience.",
  },
];

const FAQ: FaqItem[] = [
  {
    q: "Is AutoAppli a Wonsulting alternative for students?",
    a: "Yes, with a different shape. Wonsulting bundles AI tools with 1:1 human coaching and an AutoApply queue. AutoAppli is software-only — no coaching marketplace, no auto-submit, no application queue. If you want a real human reviewing your resume and rehearsing answers with you, Wonsulting's coaching is the pick. If you want the AI prep ungated and a kanban that carries every artifact, AutoAppli is the call.",
  },
  {
    q: "Does AutoAppli have an AutoApply feature like WonsultingAI?",
    a: "No, on purpose. Wonsulting's AutoApply preps each role and asks you to review before submitting — that's a real product, not a spam tool. AutoAppli still won't ship one. The Chrome extension is read-only and the backend has zero browser-automation libraries. The position: typing your name into the form is worth the 30 seconds because it forces you to read the listing one more time, and recruiters can tell when applications fire in batches at 2am.",
  },
  {
    q: "What about Wonsulting's coaching service — does AutoAppli replace that?",
    a: "No. Wonsulting's 1:1 coaching with former Fortune 500 hiring managers is a genuinely different product, and the 'job offer in 120 days or you don't pay' guarantee is a strong commitment for someone who can afford it. AutoAppli is software, not a coach. If your search is stuck on something a human needs to diagnose — interview pacing, salary negotiation, a tricky pivot — book the coaching. Use AutoAppli for the prep and tracker piece either way.",
  },
  {
    q: "Which is better for a first-gen or underrepresented student in CS recruiting?",
    a: "Honest answer: it depends on whether the bottleneck is information or execution. Wonsulting's content and community are strong on the 'how does this even work' side — what does a behavioral round look like, how do referrals actually happen, how do I write a resume from a non-traditional background. AutoAppli is stronger once you know the shape and need to crank out 40 tailored applications a cycle without burning out. A lot of students use both: Wonsulting's free content for the playbook, AutoAppli for the daily grind.",
  },
];

export default function WonsultingComparisonPage() {
  return (
    <ComparisonPage
      competitor="Wonsulting"
      competitorSlug="Wonsulting"
      eyebrow="AutoAppli vs Wonsulting"
      heading="AutoAppli vs Wonsulting: which fits a student internship search?"
      subheading="Wonsulting bundles AI tools with 1:1 human coaching and an AutoApply queue. AutoAppli is software-only — no coaching marketplace, no auto-submit, just per-JD resume tailoring, cover letters, outreach, and a kanban tracker tuned for the student cycle. Here's the honest comparison."
      whatEachDoesWell={{
        autoappli:
          "Built for the student internship cycle. Per-JD resume tailoring in about 30 seconds, cover letter and recruiter outreach drafted from the listing, kanban tracker carrying every artifact. Chrome extension is read-only — it saves jobs, never clicks apply. Core AI features stay free for verified students.",
        competitor:
          "Wonsulting genuinely cares about candidates who didn't grow up around the recruiting playbook. Founded by Jonathan Javier and Jerry Lee, the brand has a real community and free content stack for first-gen and underrepresented students. The AI suite covers the basics (ResumAI, CoverLetterAI, NetworkAI, InterviewAI, JobBoardAI, JobTrackerAI) and 1:1 coaching from former Fortune 500 hiring managers is the big differentiator if you want a human in the loop.",
      }}
      rows={ROWS}
      whenCompetitorMakesSense={{
        title: "When Wonsulting makes sense",
        body: "Wonsulting is the right pick if you want a human coach in the loop, you're earlier in figuring out the recruiting playbook, or the AutoApply queue genuinely fits your search shape (wide funnel, similar role types, willing to review each one). The 'job offer in 120 days or you don't pay' coaching guarantee is a strong commitment if you can stretch to that price point, and the free content library is real value on its own. If your bottleneck is information or accountability — not application volume — a human coach beats any AI tool.",
      }}
      whereAutoappliIsDifferent={{
        title: "Where AutoAppli is different",
        body: "Three things. First, AutoAppli is software-only. No coaching marketplace, no upsell to a $1k+ package — the whole product is the kanban plus the AI prep, free for students while we're building. Second, no auto-submit, even with review. The extension is read-only, the backend has no browser-automation libs. Third, the live multi-source firehose: AutoAppli's discover page pulls from a Supabase cache plus live ATS scrapers (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Indeed) so you find the role before you go save it. Wonsulting's job board is curated; AutoAppli's is exhaustive.",
      }}
      whatThisMeansForCallbacks={{
        title: "What this means for your callback rate",
        body: "Coaching raises your floor — fewer obvious mistakes, better story, sharper interview answers. Tailoring raises your ceiling per application. AutoApply raises your volume, which only matters if your applications already convert. For most students the binding constraint is per-application quality, not application count, and that's the lever AutoAppli optimizes hardest. Coaching is complementary, not competing — if it fits the budget, run both.",
        studentExample:
          "A first-gen CS junior at a mid-tier state school used Wonsulting's free content all summer to learn the playbook — what referrals are, how behavioral rounds work, how to write a resume when nobody in the family has a corporate job. Hit fall recruiting and switched to AutoAppli for the daily work: 4 to 6 tailored applications a week, every one with a cover letter naming the team and a DM to a recent grad. By December: 11 callbacks, 4 first-rounds, 2 final-rounds, an offer at a company they couldn't have named in August. Different tools, different jobs, both did theirs.",
      }}
      faq={FAQ}
    />
  );
}
