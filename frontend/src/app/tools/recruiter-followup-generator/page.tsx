import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RecruiterFollowupUI from "./recruiter-followup-ui";

/**
 * /tools/recruiter-followup-generator — heuristic recruiter follow-up generator.
 *
 * Targets:
 *   - "recruiter follow up email after application"
 *   - "thank you email after interview internship"
 *   - "follow up email no response recruiter"
 */
export const metadata: Metadata = {
  title: "Recruiter Follow-up Generator · AutoAppli",
  description:
    "Generate 3 recruiter follow-up email templates — post-application nudge, post-interview thank-you, and ghosted re-engage. Free, no signup, runs entirely in your browser. No AI, no data sent anywhere.",
  keywords: [
    "recruiter follow up email",
    "follow up email after applying",
    "thank you email after interview internship",
    "follow up email no response recruiter",
    "how to follow up with recruiter",
    "ghosted by recruiter follow up",
    "free follow up email generator",
  ],
  alternates: { canonical: "/tools/recruiter-followup-generator" },
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
    title: "Recruiter Follow-up Generator · AutoAppli",
    description:
      "Pick a pattern, fill in your details — get a ready-to-send follow-up email. Post-application nudge, post-interview thank-you, or ghosted re-engage. Browser-only, no AI.",
    url: "/tools/recruiter-followup-generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recruiter Follow-up Generator · AutoAppli",
    description:
      "3 follow-up email patterns for every stage: applied, interviewed, or ghosted. No signup, no AI, runs in your browser.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export default function RecruiterFollowupGeneratorPage() {
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
          Recruiter follow-up generator
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl text-pretty">
          Pick your situation — just applied, just interviewed, or radio
          silence for two weeks — fill in a few fields, and get a
          ready-to-send follow-up. Three patterns, all under 120 words,
          written to sound like a real person. Edit inline, then copy.
          No signup, no AI, nothing leaves your browser.
        </p>

        <RecruiterFollowupUI />

        {/* CTA upsell */}
        <section className="mt-12 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 to-zinc-950 p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            AutoAppli drafts follow-ups from the job you saved — not a blank form.
          </h2>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            This tool gives you a solid starting point. AutoAppli goes
            further — it knows the recruiter's name, the role context, and
            where you are in the process from the job you bookmarked, then
            drafts outreach that actually references your application. No
            copy-paste from a form.
          </p>
          <Link
            href="/signup"
            className={`mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25 ${FOCUS_RING}`}
          >
            Try AutoAppli free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        {/* SEO / editorial section */}
        <section className="mt-12 prose prose-invert prose-sm max-w-none text-zinc-400">
          <h2 className="text-zinc-100 text-lg font-semibold">
            When to send each follow-up
          </h2>
          <ul className="mt-3 space-y-3 list-disc list-inside">
            <li>
              <span className="text-zinc-200">Post-application nudge.</span>{" "}
              Send 5–7 business days after you submitted. Before this, you're
              just anxious. After 10 days with no response, move to the
              ghosted template. One nudge is fine; two is borderline; three
              is too many.
            </li>
            <li>
              <span className="text-zinc-200">Post-interview thank-you.</span>{" "}
              Send the same day, within a few hours if possible. Reference
              one specific thing — a question they asked, a problem they
              described, something the interviewer seemed genuinely excited
              about. Generic thank-yous land in a pile; specific ones get
              read.
            </li>
            <li>
              <span className="text-zinc-200">Ghosted 2-week nudge.</span>{" "}
              The goal here is not to guilt-trip — it's to surface your name
              one more time and give them an easy out. "No worries if the
              role moved in a different direction" lowers the social cost
              of replying with bad news, which means they're more likely to
              actually reply.
            </li>
          </ul>

          <h2 className="mt-8 text-zinc-100 text-lg font-semibold">
            The one thing to personalise before hitting send
          </h2>
          <p>
            The optional detail field does most of the work. A recruiter who
            reads "I noticed you recently open-sourced your data pipeline"
            knows you're not mass-blasting. It doesn't need to be impressive
            — just specific to them. One sentence is enough.
          </p>
        </section>
      </main>
    </div>
  );
}
