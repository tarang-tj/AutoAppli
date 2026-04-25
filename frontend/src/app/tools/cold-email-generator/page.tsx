import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ColdEmailUI from "./cold-email-ui";

/**
 * /tools/cold-email-generator — heuristic cold email template generator.
 *
 * Targets:
 *   - "cold email generator internship"
 *   - "cold email template recruiter student"
 *   - "how to cold email for internship"
 */
export const metadata: Metadata = {
  title: "Cold Email Generator · AutoAppli",
  description:
    "Generate 3 proven cold email templates for recruiters, engineers, or alumni — customised to your inputs. Free, no signup, runs entirely in your browser. No AI, no data sent anywhere.",
  keywords: [
    "cold email generator",
    "cold email template internship",
    "cold email recruiter student",
    "how to cold email for internship",
    "cold outreach email college student",
    "free cold email generator",
  ],
  alternates: { canonical: "/tools/cold-email-generator" },
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
    title: "Cold Email Generator · AutoAppli",
    description:
      "Fill in who you're emailing and why — get 3 cold email templates (short curious, value-first, ask-for-advice). Free, browser-only.",
    url: "/tools/cold-email-generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cold Email Generator · AutoAppli",
    description:
      "3 cold email templates customised to your inputs. No signup, no AI, runs in your browser.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export default function ColdEmailGeneratorPage() {
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
          Cold email generator
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl text-pretty">
          Fill in who you're reaching out to and why. We generate three
          templates built around proven cold-outreach patterns — short
          and curious, value-first, and ask-for-advice. Edit them inline,
          then copy. No signup, no AI, nothing leaves your browser.
        </p>

        <ColdEmailUI />

        {/* CTA upsell */}
        <section className="mt-12 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 to-zinc-950 p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            AutoAppli drafts outreach from the job you saved — not a blank form.
          </h2>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            This tool gives you a solid starting point. AutoAppli goes
            further — it pulls the recruiter's name, the role context,
            and the company's recent news from the listing you bookmarked,
            then generates outreach that sounds like you actually did
            your homework. Because it did.
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
            What each template pattern is good for
          </h2>
          <ul className="mt-3 space-y-3 list-disc list-inside">
            <li>
              <span className="text-zinc-200">Short &amp; curious.</span>{" "}
              Best when you have one specific reason to email this person —
              a post they wrote, a project they shipped, a talk they gave.
              Under 100 words. Easy to read on a phone.
            </li>
            <li>
              <span className="text-zinc-200">Value-first.</span>{" "}
              Opens with a signal that you've done real research on their
              work, not just their LinkedIn. Good for engineers and PMs
              who get a lot of generic "I love your company" emails.
            </li>
            <li>
              <span className="text-zinc-200">Ask-for-advice.</span>{" "}
              The lowest-friction ask. "Can I pick your brain?" converts
              better than "Can I have a referral?" when you have no
              existing relationship.
            </li>
          </ul>

          <h2 className="mt-8 text-zinc-100 text-lg font-semibold">
            What to personalise before sending
          </h2>
          <p>
            These templates are starting points, not final drafts. The
            single most important edit is the specific hook in the opener —
            something only you could know about them. A paper they cited, a
            GitHub repo they maintain, a comment they left in a Hacker News
            thread. Generic openers get archived. Specific ones get replies.
          </p>
        </section>
      </main>
    </div>
  );
}
