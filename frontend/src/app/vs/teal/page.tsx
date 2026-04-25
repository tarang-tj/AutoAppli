import type { Metadata } from "next";
import {
  ComparisonPage,
  type ComparisonRow,
  type FaqItem,
} from "@/components/marketing/comparison-page";

export const metadata: Metadata = {
  title: "AutoAppli vs Teal — for students",
  description:
    "Looking for a Teal alternative for students? AutoAppli ships the kanban tracker, JD-tailored resumes, cover letters, and a live multi-source job firehose — tuned for internship recruiting, not mid-career. Honest side-by-side.",
  keywords: [
    "teal alternative",
    "teal alternative for students",
    "teal vs autoappli",
    "tealhq alternative",
    "student internship tracker kanban",
  ],
  alternates: {
    canonical: "/vs/teal",
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
    title: "AutoAppli vs Teal — for students",
    description:
      "Teal is a polished general-audience tracker plus resume builder. AutoAppli is the student-internship-specific version with deeper free AI prep. Compare them honestly.",
    url: "/vs/teal",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAppli vs Teal — for students",
    description:
      "Same kanban shape, different audience. Teal is broad and mid-career-leaning; AutoAppli is student-tuned with the AI prep on the free tier.",
  },
};

const ROWS: ComparisonRow[] = [
  {
    feature: "Auto-submits applications for you",
    autoappli: "no",
    autoappliNote: "Read-only extension. Zero browser automation in the backend.",
    competitor: "no",
    competitorNote: "Teal is a tracker plus resume builder, not an auto-applier. Same posture here.",
  },
  {
    feature: "Resume tailoring per JD",
    note: "A fresh resume tuned to this specific listing.",
    autoappli: "yes",
    autoappliNote: "Claude-backed, ~30 seconds per role. Free for verified students.",
    competitor: "partial",
    competitorNote: "Resume builder is free; AI keyword matching and analysis are gated behind Teal+ ($29/month).",
  },
  {
    feature: "Cover letter generator",
    autoappli: "yes",
    autoappliNote: "Drafted from the JD on the free tier.",
    competitor: "partial",
    competitorNote: "AI cover letter generation requires Teal+.",
  },
  {
    feature: "Recruiter outreach drafts",
    note: "Cold DMs to hiring managers or current employees on the team.",
    autoappli: "yes",
    autoappliNote: "Personalized to the role and the person, sounds like a student.",
    competitor: "partial",
    competitorNote: "Contact tracker stores recruiter info; outreach drafting itself is light.",
  },
  {
    feature: "Interview prep",
    autoappli: "yes",
    autoappliNote: "Likely questions, talking points, company overview, PII-redacted.",
    competitor: "no",
    competitorNote: "No generative interview prep advertised — interview tracking only.",
  },
  {
    feature: "Kanban application tracker",
    note: "Drag-and-drop board where every card carries the artifacts.",
    autoappli: "yes",
    autoappliNote: "Mobile-snap kanban; @hello-pangea/dnd under the hood.",
    competitor: "yes",
    competitorNote: "Kanban-style stages: Saved, Applied, Interview, Offer, Rejected.",
  },
  {
    feature: "Browser extension",
    autoappli: "yes",
    autoappliNote: "Saves from LinkedIn, Greenhouse, Lever, Ashby, Indeed, Workday.",
    competitor: "yes",
    competitorNote: "Mature 4.9-star Chrome extension across 40+ job boards.",
  },
  {
    feature: "Free tier",
    autoappli: "yes",
    autoappliNote: "Free demo while we're building. Core stays free for verified students.",
    competitor: "partial",
    competitorNote: "Free tier covers tracking and the basic resume builder. AI tailoring, keyword matching, and cover letters require Teal+ at $29/month or $13/week.",
  },
  {
    feature: "Student-specific tuning",
    note: "Internship cycle defaults, new-grad calendar, course-aware matching.",
    autoappli: "yes",
    autoappliNote: "Built by a CS junior, defaults set for the Sept-Nov internship rush.",
    competitor: "no",
    competitorNote: "Audience is broad and skews career-changer / mid-career. No internship-specific tuning advertised.",
  },
];

const FAQ: FaqItem[] = [
  {
    q: "Is AutoAppli a free Teal alternative for students?",
    a: "Yes. The kanban shape is the same — Saved, Applied, Interview, Offer, Rejected — and neither tool auto-submits. The differences: AutoAppli's AI prep (per-JD resume tailoring, cover letter, outreach, interview prep) ships on the free tier, where Teal gates most of it behind Teal+ at $29/month. AutoAppli is also tuned for the student internship calendar; Teal is broad-audience and skews mid-career.",
  },
  {
    q: "Why pick AutoAppli over Teal if Teal already has the kanban and a great extension?",
    a: "If you're a working professional running a wide search and you can swing $29/month, Teal is genuinely a polished, mature product. The pick changes for college students for two reasons. One, the AI features that matter for callback rate (resume tailoring, cover letter, outreach) are Teal+ only — the spend stacks up across an internship cycle. Two, Teal's defaults assume career experience, multi-page resumes, and post-grad role types. AutoAppli's defaults assume one-page student resumes, coursework-aware match scoring, and internship-cycle timing.",
  },
  {
    q: "Can I import my Teal tracker into AutoAppli?",
    a: "Not as a one-click import yet. You can export your jobs from Teal and add them to your AutoAppli kanban, or just start saving new roles via the Chrome extension going forward. If enough students ask for a direct import, we'll build it — email hello@autoappli.com.",
  },
  {
    q: "Does AutoAppli have a live job search like Teal's job board?",
    a: "Yes, and it's a real differentiator. The discover page pulls from a Supabase cache plus live scrapers across multiple ATS sources (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Indeed) with URL-based dedup. Teal's surface is more save-as-you-browse — you go to LinkedIn or Indeed first, save with the extension, then it lives on the board. AutoAppli ships both: the firehose to find the role, the extension to save the rest.",
  },
];

export default function TealComparisonPage() {
  return (
    <ComparisonPage
      competitor="Teal"
      competitorSlug="Teal"
      eyebrow="AutoAppli vs Teal"
      heading="AutoAppli vs Teal: which fits a student internship search?"
      subheading="Teal is a polished general-audience tracker plus resume builder, with the AI features behind Teal+. AutoAppli ships the same kanban shape with the AI prep — JD-tailored resume, cover letter, recruiter outreach, interview prep — on the free tier, tuned for the student internship cycle. Same 'no auto-submit' stance. Here's the honest line-by-line."
      whatEachDoesWell={{
        autoappli:
          "Built for the student internship cycle. Same kanban discipline Teal popularized, plus deeper AI prep on the free tier. Per-JD resume tailoring in about 30 seconds, cover letter and outreach drafted from the listing, interview prep with PII redaction, live multi-source firehose for finding the role in the first place. Chrome extension is read-only — it saves, it never autofills.",
        competitor:
          "Teal is one of the most polished job-search tools out there. 650k+ users, a 4.9-star Chrome extension across 40+ job boards, a clean kanban tracker with the standard stages, and a free resume builder that genuinely is free. Teal+ at $29/month unlocks the AI tailoring, keyword matching, and cover letter generation. For a career-changer or mid-career professional, it's a sensible default.",
      }}
      rows={ROWS}
      whenCompetitorMakesSense={{
        title: "When Teal makes sense",
        body: "Teal is the right pick if you're past college, running a multi-year career-pivot search, or you just want a clean tracker plus a free resume builder and don't need the AI features. The Chrome extension across 40+ boards is best-in-class, the kanban is mature, and the resume builder ships ATS-friendly templates without a paywall. If your search is broad, your resume is multi-page, and you're willing to spend $29/month on Teal+ to unlock the tailoring layer, Teal is hard to beat for general use.",
      }}
      whereAutoappliIsDifferent={{
        title: "Where AutoAppli is different",
        body: "Three things. First, the AI prep that matters for callback rate ships free for students — Teal puts those behind Teal+. Second, the whole product is tuned for the student internship cycle: match scoring respects coursework and projects, the resume tailor respects the one-page student convention, the calendar assumes Sept-Nov for next summer's internships and Jan-Mar for new-grad. Third, the live multi-source firehose: the discover page pulls cached jobs plus live scrapes across Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and Indeed, so you can find the role inside AutoAppli before you save it. Teal expects you to bring the role from elsewhere.",
      }}
      whatThisMeansForCallbacks={{
        title: "What this means for your callback rate",
        body: "Tracking discipline keeps you from losing roles in tab chaos. Tailoring keeps you from being filtered out at the resume screen. You need both, and the gating matters. Teal makes you choose — pay $29/month for the tailoring layer or accept generic applications. AutoAppli ships them together for students at no cost. For an internship cycle where the recruiter is reading every line of every application, the tailoring layer isn't a nice-to-have — it's the difference between a callback rate that justifies the search and one that doesn't.",
        studentExample:
          "A junior CS major at a Pac-12 school used Teal free tier for fall recruiting — kanban worked great, extension saved jobs across LinkedIn and Greenhouse cleanly. Hit a wall when 'tailor this resume to the JD' was Teal+ only and the student's budget didn't stretch. Switched to AutoAppli mid-cycle, kept the kanban habit, started tailoring every application end-to-end. Same applications-per-week, different prep depth. Callback rate roughly tripled across the back half of the cycle, including a screen at one of the named-tier companies that had auto-rejected the generic resume two months earlier.",
      }}
      faq={FAQ}
    />
  );
}
