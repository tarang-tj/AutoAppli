import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, FileSearch } from "lucide-react";

/**
 * /tools — index page for free, no-signup interactive tools.
 *
 * These are programmatic-SEO surfaces. Each tool is a real, useful
 * thing that runs entirely in the browser — no API calls, no AI,
 * no data leaves the page. The job is to rank for "<problem>
 * tester / extractor / checker" searches and let the visitor see
 * AutoAppli's voice and quality before they sign up.
 */
export const metadata: Metadata = {
  title: "Free tools for the internship grind — AutoAppli",
  description:
    "Free, no-signup tools for college students running an internship search. Score your cold-email subject lines, extract ATS keywords from a JD. Runs in your browser.",
  keywords: [
    "free job search tools",
    "internship tools",
    "cold email subject line tester",
    "ats keyword extractor",
    "resume keyword finder",
  ],
  alternates: { canonical: "/tools" },
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
    title: "Free tools for the internship grind — AutoAppli",
    description:
      "Two no-signup tools for the student job search: a cold-email subject line tester and an ATS keyword extractor. Browser-only, no data sent anywhere.",
    url: "/tools",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free tools for the internship grind",
    description:
      "Cold-email subject line tester + ATS keyword extractor. No signup, no data sent anywhere.",
  },
};

interface ToolCard {
  href: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
}

const TOOLS: ToolCard[] = [
  {
    href: "/tools/subject-line-tester",
    title: "Cold email subject line tester",
    blurb:
      "Paste a subject line, get a score from 0–10 and a list of the recruiter-template tells you’re tripping. Suggests rewrites if the score is weak.",
    icon: <Mail className="h-5 w-5" aria-hidden="true" />,
  },
  {
    href: "/tools/resume-keyword-extractor",
    title: "Resume keyword extractor",
    blurb:
      "Paste a job description, get the 18 terms an ATS or recruiter is most likely to scan for. Optionally paste your resume to see what’s missing.",
    icon: <FileSearch className="h-5 w-5" aria-hidden="true" />,
  },
];

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export default function ToolsIndexPage() {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100"
      style={{ colorScheme: "dark" }}
    >
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10">
          <Link
            href="/"
            className={`text-sm text-zinc-500 hover:text-zinc-300 transition-colors ${FOCUS_RING} rounded`}
          >
            ← AutoAppli
          </Link>
        </div>

        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance">
          Free tools for the internship grind
        </h1>
        <p className="mt-5 text-lg text-zinc-400 max-w-2xl leading-relaxed text-pretty">
          No signup. Nothing leaves your browser. Two small utilities we built
          for the same students AutoAppli is built for — score a cold-email
          subject before you send it, pull the keywords out of a JD before
          you tailor your resume.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`group rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70 ${FOCUS_RING}`}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-2 text-blue-300">
                  {t.icon}
                </div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {t.title}
                </h2>
              </div>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                {t.blurb}
              </p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-300 group-hover:text-blue-200">
                Open
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-16 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h2 className="text-base font-semibold text-zinc-100">
            What AutoAppli does, that these don’t
          </h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            These tools nudge one thing at a time. AutoAppli does the whole
            ten-minute prep — resume tailored to the JD, cover letter from
            the listing, recruiter outreach drafted for you, every saved
            role on a kanban. You still click apply. We just stop wasting
            your evenings.
          </p>
          <Link
            href="/signup"
            className={`mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25 ${FOCUS_RING}`}
          >
            Try AutoAppli
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </main>
    </div>
  );
}
