import type { Metadata } from "next";
import Link from "next/link";
import { Mic, History, BookOpenText } from "lucide-react";
import { PracticeCard } from "./_components/practice-card";

/**
 * /interview-practice — hub linking the two interview-practice surfaces
 * (Mock Interview + session history) and the Story Library.
 *
 * No auth gate — consistent with /tools. Anyone can land here and explore.
 * Layout mirrors /tools: same dark zinc shell, same card grid vocabulary.
 */
export const metadata: Metadata = {
  title: "Interview Practice — AutoAppli",
  description:
    "Practice behavioural interviews with AI, review past sessions, and bank your best answers as STAR stories you can reuse in any future interview.",
  keywords: [
    "interview practice",
    "behavioural interview",
    "mock interview",
    "STAR method",
    "interview stories",
    "internship interview prep",
  ],
  alternates: { canonical: "/interview-practice" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    title: "Interview Practice — AutoAppli",
    description:
      "AI mock interviews, session history, and a personal story library. Everything you need to walk into a behavioural round with confidence.",
    url: "/interview-practice",
  },
  twitter: {
    card: "summary_large_image",
    title: "Interview Practice — AutoAppli",
    description: "AI mock interviews + STAR story library. No signup required to try.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

const CARDS = [
  {
    href: "/interview/mock",
    title: "Mock interview",
    blurb:
      "Paste a job description, pick a role, and get 3–7 AI-generated behavioural questions with real-time feedback on clarity, structure, specificity, and relevance.",
    icon: <Mic className="h-5 w-5" aria-hidden="true" />,
    badge: "AI-powered",
  },
  {
    href: "/interview/mock/history",
    title: "Session history",
    blurb:
      "Review every completed mock session: per-question feedback, dimension scores, and strengths vs. improvements. Jump back to any session to resume or study your scorecard.",
    icon: <History className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/stories",
    title: "Story library",
    blurb:
      "Bank your best STAR-format answers once, reuse them across every application and interview. Import directly from a mock session with one click.",
    icon: <BookOpenText className="h-5 w-5" aria-hidden="true" />,
  },
];

export default function InterviewPracticePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ colorScheme: "dark" }}>
      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Back breadcrumb */}
        <div className="mb-10">
          <Link
            href="/"
            className={`text-sm text-zinc-500 transition-colors hover:text-zinc-300 ${FOCUS_RING} rounded`}
          >
            ← AutoAppli
          </Link>
        </div>

        {/* Hero copy */}
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Interview practice
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-400">
          Rehearse behavioural rounds with an AI interviewer, review past sessions to track
          your progress, and build a personal library of STAR stories you can drop into any
          interview. Each piece connects — finish a mock, bank your best answer as a story
          in two clicks.
        </p>

        {/* Card grid */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <PracticeCard key={card.href} {...card} />
          ))}
        </div>

        {/* Tip callout */}
        <section className="mt-16 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            The workflow that actually works
          </h2>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-400 [counter-reset:steps]">
            {[
              "Run a mock interview with the JD you're targeting.",
              'On the scorecard, hit \u201cSave as story\u201d on any answer worth keeping.',
              "The story form opens prefilled — clean it up in 30 seconds.",
              "Before your real interview, skim your library to prime the answers.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 font-mono text-[10px] text-blue-300">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
