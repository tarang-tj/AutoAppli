import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SalaryNegotiationUI from "./salary-negotiation-ui";

/**
 * /tools/salary-negotiation-templates — heuristic salary negotiation email generator.
 *
 * Targets:
 *   - "salary negotiation email template"
 *   - "how to counter offer salary internship"
 *   - "salary negotiation email with competing offer"
 *   - "ask for more time to decide job offer"
 */
export const metadata: Metadata = {
  title: "Salary Negotiation Email Templates · AutoAppli",
  description:
    "3 salary negotiation email templates — counter-offer, competing-offer leverage, and ask-for-time. Free, no signup, runs entirely in your browser. No AI, no data sent anywhere.",
  keywords: [
    "salary negotiation email template",
    "how to counter offer salary",
    "salary negotiation email internship",
    "competing offer salary negotiation",
    "ask for more time job offer email",
    "how to negotiate salary new grad",
    "free salary negotiation email generator",
  ],
  alternates: { canonical: "/tools/salary-negotiation-templates" },
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
    title: "Salary Negotiation Email Templates · AutoAppli",
    description:
      "Pick a pattern, fill in your numbers — get a ready-to-send negotiation email. Counter-offer, competing-offer leverage, or ask for more time. Browser-only, no AI.",
    url: "/tools/salary-negotiation-templates",
  },
  twitter: {
    card: "summary_large_image",
    title: "Salary Negotiation Email Templates · AutoAppli",
    description:
      "3 negotiation patterns: counter-offer, leverage a competing offer, or request more time. No signup, no AI, runs in your browser.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export default function SalaryNegotiationTemplatesPage() {
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
          Salary negotiation email templates
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl text-pretty">
          Three patterns for the most common negotiation scenarios — counter a
          number, leverage a competing offer, or buy yourself more time. Fill
          in your details, edit inline, then copy. Honest and professional.
          No signup, no AI, nothing leaves your browser.
        </p>

        <SalaryNegotiationUI />

        {/* CTA upsell */}
        <section className="mt-12 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 to-zinc-950 p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            AutoAppli tracks your offers so you never lose the thread.
          </h2>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            This tool generates the email. AutoAppli goes further — it knows
            the role, the timeline, and what you wrote last time from the job
            you bookmarked, so you can follow up on any saved role without
            hunting through your inbox. Negotiate from context, not memory.
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
            When to use each template
          </h2>
          <ul className="mt-3 space-y-3 list-disc list-inside">
            <li>
              <span className="text-zinc-200">Counter-offer.</span>{" "}
              Use this when the offer is below your target and you have market
              data to back it up. State a specific number — "somewhere in
              that range" is weaker than "$95,000". Recruiters find it easier
              to advocate for a concrete ask.
            </li>
            <li>
              <span className="text-zinc-200">Competing offer leverage.</span>{" "}
              Only use this if you actually have another offer. Bluffing is
              discoverable and career-damaging. If you do have one, be
              transparent about the number and reaffirm your preference — the
              goal is alignment, not a bidding war.
            </li>
            <li>
              <span className="text-zinc-200">Ask for more time.</span>{" "}
              Most companies will grant 3–7 days if you ask once and give a
              real reason. Don't ask twice — it signals ambivalence. If you
              genuinely need more time, be honest about why.
            </li>
          </ul>

          <h2 className="mt-8 text-zinc-100 text-lg font-semibold">
            The one thing negotiators get wrong
          </h2>
          <p>
            They apologize. "I'm sorry to ask, but…" signals that you think
            negotiating is unreasonable — which primes the reader to feel the
            same way. You don't need to apologize for knowing your market
            value. Thank them for the offer, state your ask clearly, and close
            with warmth. That's all it takes.
          </p>
        </section>
      </main>
    </div>
  );
}
