import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import KeywordExtractorClient from "./resume-keyword-extractor-client";

/**
 * /tools/resume-keyword-extractor — server-rendered shell + client tool.
 *
 * Targets:
 *   - "extract keywords from job description"
 *   - "ats keyword extractor"
 *   - "resume keyword finder"
 */
export const metadata: Metadata = {
  title: "Resume keyword extractor — free ATS keyword finder",
  description:
    "Paste a job description, get the 18 keywords an ATS or recruiter is most likely to scan for. Optional: paste your resume to see what’s missing. Free, no signup.",
  keywords: [
    "extract keywords from job description",
    "ats keyword extractor",
    "resume keyword finder",
    "ats resume scanner",
    "job description keyword tool",
  ],
  alternates: { canonical: "/tools/resume-keyword-extractor" },
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
    title: "Resume keyword extractor — free ATS keyword finder",
    description:
      "Paste a JD, get the keywords that matter. Optionally paste your resume to find the gaps. Browser-only — nothing is sent anywhere.",
    url: "/tools/resume-keyword-extractor",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resume keyword extractor",
    description:
      "Pull ATS keywords out of a JD in your browser. Free, no signup.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export default function ResumeKeywordExtractorPage() {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100"
      style={{ colorScheme: "dark" }}
    >
      <main className="mx-auto max-w-4xl px-6 py-12 md:py-16">
        <div className="mb-8">
          <Link
            href="/tools"
            className={`text-sm text-zinc-500 hover:text-zinc-300 transition-colors ${FOCUS_RING} rounded`}
          >
            ← Tools
          </Link>
        </div>

        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          Resume keyword extractor
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl text-pretty">
          Paste a job description. We pull out the 18 terms an ATS or
          recruiter is most likely to scan for, weighted by how often they
          show up and how early. Optionally paste your resume to see which
          keywords you’re missing.
        </p>

        <KeywordExtractorClient />

        <section className="mt-12 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 to-zinc-950 p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            AutoAppli automatically tailors your resume against these keywords.
          </h2>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            Knowing the keywords is step one. Step two is rewriting your
            bullets so they actually land — without making things up. AutoAppli
            does that in about 30 seconds per role, then keeps a per-JD
            version on your kanban so you’re not hunting for the right resume
            at 11pm.
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
            How the ranking works
          </h2>
          <p className="mt-2 leading-relaxed">
            Every keyword’s weight is its frequency multiplied by a small
            early-occurrence bonus — terms in the first paragraph of the JD
            get a 1.5× boost. We strip stopwords and the usual JD filler
            (&quot;required&quot;, &quot;experience&quot;,
            &quot;candidate&quot;) so the list stays signal, not noise.
            Multi-word phrases like &quot;machine learning&quot; or &quot;full
            stack&quot; are recognized as single terms. Everything runs in
            your browser — no JD or resume content is ever sent to a server.
          </p>
        </section>
      </main>
    </div>
  );
}
