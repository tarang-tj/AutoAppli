import type { Metadata } from "next";
import {
  ComparisonPage,
  type ComparisonRow,
  type FaqItem,
} from "@/components/marketing/comparison-page";

export const metadata: Metadata = {
  title: "AutoAppli vs Huntr — for students",
  description:
    "Looking for a Huntr alternative for students? AutoAppli is the kanban tracker plus the AI prep — JD-tailored resume, cover letters, recruiter outreach. You still hit apply. Honest side-by-side.",
  keywords: [
    "huntr alternative",
    "huntr alternative for students",
    "huntr vs autoappli",
    "free job tracker for students",
    "kanban job application tracker",
  ],
  alternates: {
    canonical: "/vs/huntr",
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
    title: "AutoAppli vs Huntr — for students",
    description:
      "Huntr pioneered the kanban job tracker. AutoAppli ships the same tracker plus deeper AI prep, tuned for student internship recruiting.",
    url: "/vs/huntr",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAppli vs Huntr — for students",
    description:
      "Same kanban shape, different focus. Huntr is broad-audience tracking; AutoAppli is student-tuned prep + tracker. Compare honestly.",
  },
};

const ROWS: ComparisonRow[] = [
  {
    feature: "Auto-submits applications for you",
    autoappli: "no",
    autoappliNote: "Read-only extension. Zero browser automation in the backend.",
    competitor: "no",
    competitorNote: "Huntr is a tracker, not an auto-applier — same posture here.",
  },
  {
    feature: "Resume tailoring per JD",
    note: "A fresh resume tuned to this specific listing.",
    autoappli: "yes",
    autoappliNote: "Claude-backed, ~30 seconds per role, explainable seven-signal match score.",
    competitor: "yes",
    competitorNote: "AI suggestions + keyword matching against the JD.",
  },
  {
    feature: "Cover letter generator",
    autoappli: "yes",
    competitor: "yes",
    competitorNote: "AI cover letter analyzing profile + JD.",
  },
  {
    feature: "Recruiter outreach drafts",
    note: "Cold DMs to hiring managers or current employees on the team.",
    autoappli: "yes",
    autoappliNote: "Personalized to the role and the person, sounds like a student.",
    competitor: "partial",
    competitorNote: "Contact tracker stores recruiter info; outreach drafting is light.",
  },
  {
    feature: "Interview prep",
    autoappli: "yes",
    autoappliNote: "Company overview, likely questions, talking points, PII-redacted.",
    competitor: "partial",
    competitorNote: "Interview tracker for scheduling; minimal generative prep content.",
  },
  {
    feature: "Kanban application tracker",
    note: "Drag-and-drop board where every card carries the artifacts.",
    autoappli: "yes",
    autoappliNote: "Mobile-snap kanban; @hello-pangea/dnd under the hood.",
    competitor: "yes",
    competitorNote: "Huntr basically defined the kanban-tracker shape.",
  },
  {
    feature: "Browser extension",
    autoappli: "yes",
    autoappliNote: "Saves from LinkedIn, Greenhouse, Lever, Ashby, Indeed, Workday.",
    competitor: "yes",
    competitorNote: "Saves jobs + extracts keywords + highlights relevant phrases.",
  },
  {
    feature: "Free tier",
    autoappli: "yes",
    autoappliNote: "Free demo while we're building. Core stays free for verified students.",
    competitor: "yes",
    competitorNote: "Free tier exists; premium features behind a paywall.",
  },
  {
    feature: "Student-specific tuning",
    note: "Internship cycle defaults, new-grad calendar, course-aware matching.",
    autoappli: "yes",
    autoappliNote: "Built by a CS junior, defaults set for the Sept-Nov internship rush.",
    competitor: "partial",
    competitorNote: "Targets bootcamps and universities as a segment, but core product is general.",
  },
];

const FAQ: FaqItem[] = [
  {
    q: "Is AutoAppli a free Huntr alternative for students?",
    a: "Yes. The kanban shape is the same — bookmarked, applied, interviewing, offer — and so is the philosophy of not auto-submitting. The differences: AutoAppli is tuned for the student internship cycle (Sept-Nov for next summer, Jan-Mar for new-grad), the AI features are deeper out of the box (per-JD resume tailoring, outreach drafting, interview prep), and the core stays free for verified students.",
  },
  {
    q: "Why pick AutoAppli over Huntr if Huntr already has a kanban?",
    a: "If all you want is a tracker, Huntr is great and you should use it. AutoAppli is for the student who wants the tracker plus the prep work generated automatically — resume tailored to this JD, cover letter that names the team, recruiter DM that sounds like a student. Huntr nudges toward those features through a paywall; AutoAppli puts them on the free tier and tunes them for student-shaped applications.",
  },
  {
    q: "Can I import my Huntr board into AutoAppli?",
    a: "Not as a one-click import today. You can export your Huntr CSV and add the roles to your AutoAppli kanban, or save new ones going forward via the Chrome extension. If enough students ask, we'll build a direct import — email hello@autoappli.com.",
  },
  {
    q: "Does AutoAppli auto-apply if Huntr doesn't?",
    a: "No. Same posture as Huntr — neither tool clicks apply for you, on purpose. Recruiters can tell when an application was mass-fired and the callback rate plummets, especially for competitive internships. AutoAppli sets up the ten minutes of prep that matters and lets you click apply yourself. Same idea Huntr was built on; we're just leaning further into it.",
  },
];

export default function HuntrComparisonPage() {
  return (
    <ComparisonPage
      competitor="Huntr"
      competitorSlug="Huntr"
      eyebrow="AutoAppli vs Huntr"
      heading="AutoAppli vs Huntr: which actually helps students get callbacks?"
      subheading="Huntr defined the kanban job tracker. AutoAppli is the kanban plus the AI prep — JD-tailored resume, cover letter, recruiter outreach, interview prep — all tuned for student internship recruiting. You still click apply. Here's how the two stack up."
      whatEachDoesWell={{
        autoappli:
          "Same kanban shape Huntr made the standard, plus deeper AI prep on the free tier. Per-JD resume tailoring in about 30 seconds, cover letter and outreach drafted from the listing, explainable seven-signal match score, interview prep with PII redaction. Defaults set for the student internship calendar.",
        competitor:
          "Huntr is the original kanban job tracker and the team has clearly thought hard about the shape of the search. The Chrome extension saves jobs cleanly across thousands of sites. AI resume tools, contact tracker, interview tracker, professional review service. Half a million users for a reason — it's a polished, mature product.",
      }}
      rows={ROWS}
      whenCompetitorMakesSense={{
        title: "When Huntr makes sense",
        body: "Huntr is the right pick if you want a polished tracker with a long product history, are running a non-internship search, or already have your own resume and cover letter workflow and just need a board to organize the rest. The free tier is generous enough for most casual searches and the premium AI features are competitive. For a recent grad three years out of school running a mid-career switch, Huntr's defaults probably match your shape better than AutoAppli's.",
      }}
      whereAutoappliIsDifferent={{
        title: "Where AutoAppli is different",
        body: "Two things. First, the AI prep is denser and on the free tier. Per-JD resume tailoring, cover letter, recruiter outreach, and interview prep all ship without paywall — generated from the listing itself, not from a generic template. Second, the whole product is tuned for the student internship cycle: match scoring respects coursework and projects, the resume tailor respects the one-page convention, the calendar assumes Sept-Nov and Jan-Mar are the busy windows. The recruiter-can-tell argument lands harder for internship reqs where the listing got 40 applications, not 4,000 — which is most of student recruiting.",
      }}
      whatThisMeansForCallbacks={{
        title: "What this means for your callback rate",
        body: "A tracker keeps you from losing roles in tab chaos. Tailoring keeps you from being filtered out at the resume screen. You need both. Huntr nails the first; AutoAppli gives you both on the same board. For students with limited weekly hours, the multiplier on callback rate from per-JD tailoring usually beats the marginal polish of premium tracker features.",
        studentExample:
          "A junior CS major at a flagship state school used Huntr free tier through October — solid kanban, decent AI suggestions behind the paywall. Got tired of re-writing every cover letter from scratch. Switched to AutoAppli mid-cycle, kept the kanban habit, started tailoring every application end-to-end with the generated drafts. Callback rate went from roughly 6% to roughly 18% over six weeks. Same kanban discipline, more prep automated.",
      }}
      faq={FAQ}
    />
  );
}
