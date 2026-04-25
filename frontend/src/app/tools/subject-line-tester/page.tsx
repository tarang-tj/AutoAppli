import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SubjectLineTesterClient from "./subject-line-tester-client";

/**
 * /tools/subject-line-tester — server-rendered shell + client tool.
 *
 * Targets:
 *   - "cold email subject line tester"
 *   - "recruiter email subject line"
 *   - "linkedin message subject line for students"
 */
export const metadata: Metadata = {
  title: "Cold email subject line tester — free, no signup",
  description:
    "Paste a recruiter or alum cold-email subject line, get a 0–10 score and a list of the template tells that get muted. Free, no signup, runs in your browser.",
  keywords: [
    "cold email subject line tester",
    "recruiter email subject line",
    "linkedin message subject line for students",
    "internship cold email",
    "subject line checker",
  ],
  alternates: { canonical: "/tools/subject-line-tester" },
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
    type: "website",
    title: "Cold email subject line tester — free, no signup",
    description:
      "Score your recruiter or alum cold-email subject before you send it. Real-time feedback on length, recruiter-template tells, specificity, and more.",
    url: "/tools/subject-line-tester",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cold email subject line tester",
    description:
      "Paste a subject line, get a 0–10 score and rewrites. Free, no signup.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export default function SubjectLineTesterPage() {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100"
      style={{ colorScheme: "dark" }}
    >
      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <div className="mb-8">
          <Link
            href="/tools"
            className={`text-sm text-zinc-500 hover:text-zinc-300 transition-colors ${FOCUS_RING} rounded`}
          >
            ← Tools
          </Link>
        </div>

        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          Cold email subject line tester
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl text-pretty">
          Paste your subject line. We score it 0–10 against the things
          recruiters and engineers actually mute on — recruiter-template
          phrases, length, all-caps shouting, vague openers. Real-time,
          no signup, nothing leaves your browser.
        </p>

        <SubjectLineTesterClient />

        <section className="mt-12 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 to-zinc-950 p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            AutoAppli drafts the rest of the message — not just the subject.
          </h2>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            A scored subject is the easy part. The hard part is an opener
            that proves you’re a real person, a small specific ask, and a
            polite exit — written for this person and this team. AutoAppli
            generates the whole thing from the role you saved.
          </p>
          <Link
            href="/signup"
            className={`mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25 ${FOCUS_RING}`}
          >
            Try AutoAppli
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-12 prose prose-invert prose-sm max-w-none text-zinc-400">
          <h2 className="text-zinc-100 text-lg font-semibold">
            What we’re actually checking
          </h2>
          <ul className="mt-2 space-y-1.5 list-disc list-inside">
            <li>
              <span className="text-zinc-200">Length.</span> 5–7 words is the
              sweet spot. Shorter reads as lazy, longer gets clipped in the
              inbox preview.
            </li>
            <li>
              <span className="text-zinc-200">Template tells.</span> &quot;Quick
              question&quot;, &quot;reaching out&quot;, &quot;just checking
              in&quot;, &quot;circling back&quot; — phrases recruiters
              filter on without thinking.
            </li>
            <li>
              <span className="text-zinc-200">Specificity.</span> A named
              person, a real company, a concrete role title. Bonus for any
              of those.
            </li>
            <li>
              <span className="text-zinc-200">Punctuation.</span> One
              question mark invites a reply. Three reads as panic. ALL
              CAPS reads as spam.
            </li>
            <li>
              <span className="text-zinc-200">Re:/Fwd: bait.</span> Faking
              a thread that wasn’t there is the fastest way to get blocked.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
