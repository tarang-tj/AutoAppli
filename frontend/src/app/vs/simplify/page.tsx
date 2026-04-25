import type { Metadata } from "next";
import {
  ComparisonPage,
  type ComparisonRow,
  type FaqItem,
} from "@/components/marketing/comparison-page";

export const metadata: Metadata = {
  title: "AutoAppli vs Simplify — for students",
  description:
    "Looking for a Simplify Jobs alternative? AutoAppli is built for the student internship cycle — resume tailoring per JD, cover letters, outreach, and a kanban board. You still hit apply. Side-by-side comparison.",
  keywords: [
    "simplify jobs alternative",
    "simplify vs autoappli",
    "simplify copilot alternative",
    "student internship tracker",
    "ai resume tailor for students",
  ],
  alternates: {
    canonical: "/vs/simplify",
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
    title: "AutoAppli vs Simplify — for students",
    description:
      "Simplify autofills a generic profile across thousands of boards. AutoAppli tailors per JD. For internship recruiting, the difference shows up in your callback rate.",
    url: "/vs/simplify",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAppli vs Simplify — for students",
    description:
      "Honest comparison: Simplify is broad-audience autofill. AutoAppli is student-specific tailoring. Pick the one that matches your search.",
  },
};

const ROWS: ComparisonRow[] = [
  {
    feature: "Auto-submits applications for you",
    note: "Actually clicks submit on the company's site.",
    autoappli: "no",
    autoappliNote: "Read-only by design.",
    competitor: "partial",
    competitorNote: "Copilot autofills application fields; you still review and submit on most flows.",
  },
  {
    feature: "Resume tailoring per JD",
    note: "Generates a fresh resume version aligned to this specific listing.",
    autoappli: "yes",
    autoappliNote: "Claude-backed, ~30 seconds, you edit.",
    competitor: "partial",
    competitorNote: "ATS scoring and missing-keyword hints; tailoring is more diff-style than full rewrite.",
  },
  {
    feature: "Cover letter generator",
    autoappli: "yes",
    competitor: "yes",
    competitorNote: "Cover letter and email generator built in.",
  },
  {
    feature: "Recruiter outreach drafts",
    note: "DM the hiring manager or a current employee on the team.",
    autoappli: "yes",
    competitor: "yes",
    competitorNote: "Networking Copilot suggests hiring managers + drafts the email.",
  },
  {
    feature: "Interview prep",
    autoappli: "yes",
    autoappliNote: "Likely questions, talking points, company overview, PII-redacted.",
    competitor: "unclear",
    competitorNote: "Not advertised on the public marketing pages.",
  },
  {
    feature: "Kanban application tracker",
    autoappli: "yes",
    autoappliNote: "Mobile-snap kanban with JD, resume, cover letter, outreach attached.",
    competitor: "partial",
    competitorNote: "Job tracker with bookmarks and statuses; more list-style than kanban.",
  },
  {
    feature: "Browser extension",
    autoappli: "yes",
    autoappliNote: "Read-only saving across LinkedIn, Greenhouse, Lever, Ashby, Indeed, Workday.",
    competitor: "yes",
    competitorNote: "Copilot Chrome extension is the headline product.",
  },
  {
    feature: "Free tier",
    autoappli: "yes",
    autoappliNote: "Free demo, core stays free for verified students.",
    competitor: "yes",
    competitorNote: "Free forever for tracking + autofill; Simplify+ for premium AI.",
  },
  {
    feature: "Student-specific tuning",
    autoappli: "yes",
    autoappliNote: "Internship cycle defaults, new-grad calendar, GPA-aware match scoring.",
    competitor: "partial",
    competitorNote: "Curated internship lists, but the core product targets all candidates.",
  },
];

const FAQ: FaqItem[] = [
  {
    q: "Is AutoAppli a Simplify Jobs alternative?",
    a: "Yes, especially if you're a college student. Simplify is a great broad-audience tool — autofill, tracker, networking. AutoAppli is narrower on purpose: it's built for students running internship and new-grad searches, with defaults tuned to that cycle. If you want autofill across 50+ random job boards, Simplify wins. If you want a kanban that carries every artifact for every internship you apply to, AutoAppli is the call.",
  },
  {
    q: "Does AutoAppli autofill applications like Simplify Copilot?",
    a: "No, and that's intentional. AutoAppli's extension is read-only — it saves the role into your board, but it never types into the company's form. We do the prep (resume tailored to the JD, cover letter that names the team, outreach draft), you do the last 30 seconds. Recruiters can tell when a tool autofilled a generic profile; they can't tell when you typed it yourself from a tailored resume.",
  },
  {
    q: "Can I import my Simplify tracker into AutoAppli?",
    a: "Not as a one-click import yet. You can export your jobs from Simplify and add them to your AutoAppli kanban, or just start saving new roles via the Chrome extension going forward. If enough students ask for the import, we'll build it — email hello@autoappli.com.",
  },
  {
    q: "Why is AutoAppli student-specific?",
    a: "Built by a CS junior at UW Bothell while doing his own internship search. Internship recruiting has its own calendar (Sept-Nov for next summer, Jan-Mar for new-grad), its own resume conventions (one page, course-aware, project-heavy), and its own callback dynamics (recruiters read every line for competitive reqs). The defaults reflect all of that. Other audiences are welcome; the tuning is for students.",
  },
];

export default function SimplifyComparisonPage() {
  return (
    <ComparisonPage
      competitor="Simplify"
      competitorSlug="Simplify"
      eyebrow="AutoAppli vs Simplify"
      heading="AutoAppli vs Simplify: which actually helps students get callbacks?"
      subheading="Simplify autofills a generic profile across thousands of boards. AutoAppli tailors a fresh resume to each JD, drafts the cover letter and outreach, and tracks the whole pipeline on a kanban. For students chasing internships, the difference is callback rate, not application count."
      whatEachDoesWell={{
        autoappli:
          "Built for the student internship cycle. Per-JD resume tailoring, cover letter and outreach drafts from the listing, kanban tracker carrying every artifact. The extension saves roles from LinkedIn, Greenhouse, Lever, Ashby, Indeed, and Workday — read-only, no autofill of company forms.",
        competitor:
          "Simplify is one of the best broad-audience job-search tools out there. The Copilot extension genuinely saves typing across thousands of application forms. Free forever for tracking and autofill, ATS-aware resume scoring, networking copilot for hiring-manager outreach. For a candidate at any career stage running a wide search, it's a sensible default.",
      }}
      rows={ROWS}
      whenCompetitorMakesSense={{
        title: "When Simplify makes sense",
        body: "Simplify is the right pick if your search is wide and you'll apply to roles outside the ATS boards we support — health-system career portals, government job boards, weird custom workflows. The Copilot extension turns a 7-minute application into a 90-second one and that genuinely matters when you're running 80 applications a week. The free tier covers the basics and Simplify+ unlocks the AI features that matter most. If you're not in college internship recruiting and you want a strong general-purpose autofill tool, Simplify is hard to beat.",
      }}
      whereAutoappliIsDifferent={{
        title: "Where AutoAppli is different",
        body: "Two things. First, no autofill — the extension is read-only, on purpose. AutoAppli takes the position that the cost of typing your name on a form is worth the signal it sends a recruiter that you actually read the listing. Second, the entire product is tuned for students. Match scoring weights coursework and projects, not just years of experience. Resume tailoring respects the one-page student convention. Defaults assume internship and new-grad reqs. If you're a sophomore CS major, AutoAppli's mental model maps to your search; Simplify's was built for everyone, which means it was built for nobody specific.",
      }}
      whatThisMeansForCallbacks={{
        title: "What this means for your callback rate",
        body: "Autofill saves time per application. Tailoring increases callback rate per application. Pick the lever that matters more for your search. For competitive internships at named-tier companies, the recruiter is reading the resume — generic-profile autofill won't get you to the screen. For long-tail healthcare or ops roles, an autofilled application is fine and you should apply to a hundred of them. Most students are mostly in the first bucket.",
        studentExample:
          "A sophomore data-science major at a Big Ten ran two cycles back-to-back. First cycle: Simplify autofill across 240 internship listings. Eight callbacks, mostly from companies they ranked outside their top 30. Second cycle: 70 applications, each with a JD-tailored resume, a cover letter naming the team, and a DM to a current intern. Twenty-one callbacks, including two of their top five. Same student, same school, same GPA — different lever.",
      }}
      faq={FAQ}
    />
  );
}
