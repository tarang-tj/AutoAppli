import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AtsViewClient from "./ats-view-client";

/**
 * /tools/ats-view — server-rendered shell + client tool.
 *
 * Targets:
 *   - "ats resume checker"
 *   - "ats parse resume"
 *   - "ats keyword scan"
 *   - "free ats checker"
 */
export const metadata: Metadata = {
  title: "Free ATS resume checker — see what parsers actually extract",
  description:
    "Paste your resume, see exactly what an ATS extracts and what it gets wrong. Heuristic warnings on contact info, dates, skills, and structure. Free, no signup, runs in your browser.",
  keywords: [
    "ats resume checker",
    "ats parse resume",
    "ats keyword scan",
    "free ats checker",
    "applicant tracking system",
    "resume parser",
  ],
  alternates: { canonical: "/tools/ats-view" },
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
    title: "Free ATS resume checker — see what parsers actually extract",
    description:
      "Paste your resume, see exactly what an ATS extracts and what it misses. Free, no signup, runs in your browser.",
    url: "/tools/ats-view",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free ATS resume checker",
    description:
      "Paste your resume, see what an ATS extracts. Free, no signup.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export default function AtsViewPage() {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100"
      style={{ colorScheme: "dark" }}
    >
      <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="mb-8">
          <Link
            href="/tools"
            className={`text-sm text-zinc-500 hover:text-zinc-300 transition-colors ${FOCUS_RING} rounded`}
          >
            ← Tools
          </Link>
        </div>

        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          See what an ATS actually extracts from your resume
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed max-w-2xl text-pretty">
          Paste your resume below. We run the same kind of regex-driven
          parser an Applicant Tracking System would, then flag the formatting
          choices that quietly tank your application. JobScan charges for
          this. We don&apos;t. Nothing leaves your browser.
        </p>

        <AtsViewClient />

        <section className="mt-16 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 to-zinc-950 p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            Want AutoAppli to fix these automatically?
          </h2>
          <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
            The ATS view tells you what&apos;s broken. AutoAppli&apos;s
            resume builder ships ATS-clean output by default — single column,
            consistent dates, action-verb bullets, the works. Plus tailoring
            to the JD, kanban tracking, and recruiter outreach drafted from
            the listing.
          </p>
          <Link
            href="/signup"
            className={`mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25 ${FOCUS_RING}`}
          >
            Try the resume builder
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-12 prose prose-invert prose-sm max-w-none text-zinc-400">
          <h2 className="text-zinc-100 text-lg font-semibold">
            What we&apos;re actually checking
          </h2>
          <ul className="mt-2 space-y-1.5 list-disc list-inside">
            <li>
              <span className="text-zinc-200">Contact info in the body.</span>{" "}
              Real ATSes strip headers and footers — your email and phone need
              to live in the document body.
            </li>
            <li>
              <span className="text-zinc-200">Date formats.</span> &quot;May
              2024 — Aug 2024&quot; parses cleanly. Bare &quot;2024-2025&quot;
              and date ranges without months trip parsers.
            </li>
            <li>
              <span className="text-zinc-200">A flat skills list.</span>{" "}
              Comma-separated, near the top, under a clear &quot;Skills&quot;
              header. ATSes index it heavily for keyword matching.
            </li>
            <li>
              <span className="text-zinc-200">Action-verb bullets.</span>{" "}
              &quot;Built&quot;, &quot;Shipped&quot;, &quot;Reduced&quot;
              — not &quot;Responsible for&quot; or &quot;Helped with&quot;.
            </li>
            <li>
              <span className="text-zinc-200">Single-column layout.</span>{" "}
              Tabs and two-column layouts read out of order — what looks
              clean to you reads as gibberish to the parser.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
