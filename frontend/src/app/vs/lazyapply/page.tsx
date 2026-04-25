import type { Metadata } from "next";
import {
  ComparisonPage,
  type ComparisonRow,
  type FaqItem,
} from "@/components/marketing/comparison-page";

export const metadata: Metadata = {
  title: "AutoAppli vs LazyApply — for students",
  description:
    "Looking for a LazyApply alternative? AutoAppli tailors your resume, drafts cover letters and recruiter outreach, and tracks applications on a kanban — but you still hit apply. Honest comparison for college students.",
  keywords: [
    "lazyapply alternative",
    "lazyapply vs autoappli",
    "auto apply alternative",
    "student internship tracker",
    "resume tailoring tool for students",
  ],
  alternates: {
    canonical: "/vs/lazyapply",
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
    title: "AutoAppli vs LazyApply — for students",
    description:
      "LazyApply auto-submits applications. AutoAppli doesn't. Here's why that matters for your callback rate, and what each tool is actually good for.",
    url: "/vs/lazyapply",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAppli vs LazyApply — for students",
    description:
      "Honest comparison: LazyApply mass-fires applications, AutoAppli tailors the prep. For students who want callbacks, not application counts.",
  },
};

const ROWS: ComparisonRow[] = [
  {
    feature: "Auto-submits applications for you",
    note: "Clicks the apply button on the company's site, with or without your review.",
    autoappli: "no",
    autoappliNote: "By design. No browser-automation libs in the codebase.",
    competitor: "yes",
    competitorNote: "Core feature — one-click bulk apply across boards.",
  },
  {
    feature: "Resume tailoring per JD",
    autoappli: "yes",
    autoappliNote: "Claude-backed, ~30 seconds per role.",
    competitor: "partial",
    competitorNote: "Multiple resume profiles + autofill, JD-specific tailoring is light.",
  },
  {
    feature: "Cover letter generator",
    autoappli: "yes",
    autoappliNote: "Drafted from the JD, not a template.",
    competitor: "yes",
    competitorNote: "Dedicated AI cover letter tool.",
  },
  {
    feature: "Recruiter outreach drafts",
    note: "Cold DMs that sound like a student, not a sales blast.",
    autoappli: "yes",
    competitor: "yes",
    competitorNote: "Smart referral emails to employees at target companies.",
  },
  {
    feature: "Interview prep",
    autoappli: "yes",
    autoappliNote: "Likely questions, talking points, company overview.",
    competitor: "yes",
    competitorNote: "Interview answer assistant tool.",
  },
  {
    feature: "Kanban application tracker",
    autoappli: "yes",
    autoappliNote: "Cards carry the JD, resume version, cover letter, outreach, timestamp.",
    competitor: "no",
    competitorNote: "Analytics dashboard only — no kanban-style board.",
  },
  {
    feature: "Browser extension",
    autoappli: "yes",
    autoappliNote: "Read-only. Saves the role to your board, never touches forms.",
    competitor: "yes",
    competitorNote: "Chrome extension that auto-fills and auto-applies.",
  },
  {
    feature: "Free tier",
    autoappli: "yes",
    autoappliNote: "Free demo while we're building. Core stays free for verified students.",
    competitor: "no",
    competitorNote: "Paid only — Basic plan starts at $99/year.",
  },
  {
    feature: "Student-specific tuning",
    note: "Internship cycle defaults, new-grad recruiting calendar, GPA-aware matching.",
    autoappli: "yes",
    autoappliNote: "Built by a CS junior for the Sept-Nov internship rush.",
    competitor: "no",
    competitorNote: "General-audience tool, no student-specific features advertised.",
  },
];

const FAQ: FaqItem[] = [
  {
    q: "Is AutoAppli a free LazyApply alternative?",
    a: "Yes, while we're building. The core stays free for verified students if paid features come later. No credit card, no trial timer. LazyApply's cheapest plan is $99/year. If your search budget is zero, AutoAppli is the cheaper starting point.",
  },
  {
    q: "Why doesn't AutoAppli auto-apply like LazyApply does?",
    a: "On purpose. Recruiters can tell when an application was mass-fired — generic cover letter, mismatched resume, application time at 3am. Auto-submit tools tank your callback rate, especially for competitive student roles where the recruiter is reading every line. AutoAppli sets up the ten minutes of prep that matters and lets you click apply yourself.",
  },
  {
    q: "Can I import my data from LazyApply?",
    a: "Not directly today. You can export from LazyApply's dashboard and re-add roles to your AutoAppli kanban, or use the Chrome extension to save jobs from the same board pages going forward. If enough people ask for a one-click import we'll build it — email hello@autoappli.com.",
  },
  {
    q: "Which is better for a student in fall internship recruiting?",
    a: "AutoAppli, by a wide margin. Internship recruiting is a callback-rate game, not a volume game. The recruiter sees fewer than 50 applications for most CS internship reqs and reads them. A tailored resume and a cover letter that names the team you want to work on beats 200 generic auto-fires. AutoAppli's defaults are tuned for that cycle — LazyApply's are tuned for late-career mass search.",
  },
];

export default function LazyApplyComparisonPage() {
  return (
    <ComparisonPage
      competitor="LazyApply"
      competitorSlug="LazyApply"
      eyebrow="AutoAppli vs LazyApply"
      heading="AutoAppli vs LazyApply: which actually helps students get callbacks?"
      subheading="LazyApply mass-fires applications. AutoAppli does the prep — resume tailored to the JD, cover letter, outreach draft, kanban tracker — and lets you click apply yourself. For internships and new-grad, the prep wins. Here's the honest comparison."
      whatEachDoesWell={{
        autoappli:
          "Built for the student internship cycle. Resume tailored per JD in about 30 seconds, cover letter and recruiter outreach drafted from the listing, every application tracked on a kanban with the artifacts attached. The extension is read-only — it saves jobs, it never clicks apply.",
        competitor:
          "If your goal is volume, LazyApply genuinely delivers it. One-click bulk apply across Greenhouse, Indeed, Dice, and ZipRecruiter. Multiple resume profiles, smart referral emails, and an interview-answer assistant. For a non-student running a wide late-career search, the math can work.",
      }}
      rows={ROWS}
      whenCompetitorMakesSense={{
        title: "When LazyApply makes sense",
        body: "Be fair to LazyApply: there's a real audience for it. Mid-career professionals running a wide search, contractors hunting between gigs, or anyone applying to roles where the recruiter funnel is wide and the resume bar is keyword-driven. If you're firing into a thousand similar listings on Indeed and the bottleneck is your time, an auto-applier saves hours. The $99/year plan can pay for itself in one offer. Just know what you're buying — speed and volume, not callback quality.",
      }}
      whereAutoappliIsDifferent={{
        title: "Where AutoAppli is different",
        body: "AutoAppli refuses to click apply for you. The Chrome extension is read-only. The backend has zero browser-automation libraries — no Selenium, no Playwright, no Puppeteer. It's not a missing feature, it's a posture. Recruiters at the companies students actually want — the named-tier tech, the well-funded startups, the FAANG-adjacent — read every internship application. They notice when the resume doesn't mention the team, when the cover letter is template number four, when the timestamps come in batches at 2am. AutoAppli optimizes for the part you can't fake: a resume that matches this JD, a cover letter that names this team, outreach that sounds like a student. Then you submit it.",
      }}
      whatThisMeansForCallbacks={{
        title: "What this means for your callback rate",
        body: "Volume tools optimize for application count. Callback-rate tools optimize for the percentage of applications that turn into a recruiter screen. For a student with 8 to 12 hours a week to spend on the search, the math almost always favors callback rate. Forty tailored applications get more first-rounds than four hundred mass-fired ones — and you keep the energy for the interviews when they come.",
        studentExample:
          "It's October. A junior at a state CS program applied to 380 internships through an auto-applier in two weeks. Three callbacks, all from companies they didn't actually want. Switched to tailoring 6 a week — pasted the JD, got a tuned resume and a cover letter that named the team, sent a short DM to a recent grad on the team. By December: nine callbacks, three on-sites, an offer at one of their top three.",
      }}
      faq={FAQ}
    />
  );
}
