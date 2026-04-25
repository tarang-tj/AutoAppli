import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

/**
 * /pricing — server component.
 *
 * Honest pricing: free during beta, core stays free for verified students.
 * Voice mirrors the landing page — terse, second person, real Unicode.
 */

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "AutoAppli is free while I'm building. If paid features come later, the core stays free for verified students. No credit card, no trial timer, no auto-conversion.",
  keywords: [
    "autoappli pricing",
    "free internship tracker",
    "free resume tailoring tool",
    "student job search free",
    "free for students",
  ],
  alternates: { canonical: "/pricing" },
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
    title: "AutoAppli pricing — free during beta",
    description:
      "Free while I'm building. If paid features come later, the core stays free for verified students.",
    url: "/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoAppli pricing — free during beta",
    description:
      "Free while I'm building. The core stays free for verified students.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

const FREE_TODAY: string[] = [
  "Live job firehose — Greenhouse, Lever, Ashby, Workable, SmartRecruiters, WeWorkRemotely",
  "Resume tailoring against any JD",
  "Cover letter generator",
  "Recruiter outreach drafts",
  "Interview prep + AI practice chat",
  "Kanban tracker, Chrome extension, mobile-snap",
  "Export anytime — CSV, JSON, PDF",
];

const MAYBE_PAID = [
  {
    title: "Custom-tone training on your existing resumes",
    why: "Heavier compute per user. If it ships paid, verified students get it free — your existing resumes are your data, not a premium feature.",
  },
  {
    title: "Bulk-generation (tailoring 20+ roles in one batch)",
    why: "Real cost is the model calls. Verified students get a generous student rate that covers a normal week of internship search.",
  },
  {
    title: "Team accounts",
    why: "Probably never relevant for students. If it ships, it's aimed at recruiters and career-services offices, not undergrads.",
  },
  {
    title: "Higher generation rate limits during peak hours",
    why: "If servers buckle in October, paid skip-the-line might exist. Verified students get the higher tier free during recruiting season.",
  },
];

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Will I get charged anything ever?",
    a: "Not unless I explicitly tell you 'this is a paid tier' and you opt in. There is no auto-conversion. No credit card on file means no surprise bill.",
  },
  {
    q: "What counts as a verified student?",
    a: "A working .edu email, or a recent transcript or enrollment letter. Manual review is fine — this is one person reading the request, not a vendor portal.",
  },
  {
    q: "Can I export my data if pricing changes?",
    a: "Yes. CSV, JSON, PDF. Always. The Export page exists for that reason. Your board, resumes, outreach, and timeline all leave with you.",
  },
  {
    q: "Is the Chrome extension going to start charging?",
    a: "No. The extension is a 200-line read-only DOM scraper. There's no business model in charging for that.",
  },
];

export default function PricingPage() {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col"
      style={{ colorScheme: "dark" }}
    >
      <Header />

      <main className="flex-1">
        <Hero />
        <FreeTier />
        <MaybePaidLater />
        <NotFreemiumTrick />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />

      {/* FAQPage JSON-LD for rich results. */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((it) => ({
              "@type": "Question",
              name: it.q,
              acceptedAnswer: { "@type": "Answer", text: it.a },
            })),
          }),
        }}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between gap-4 backdrop-blur-sm bg-zinc-950/80 sticky top-0 z-10">
      <Link
        href="/"
        className={`flex items-center gap-2.5 no-underline rounded-md ${FOCUS_RING}`}
        aria-label="AutoAppli home"
      >
        <div
          aria-hidden="true"
          className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20"
        >
          A
        </div>
        <span className="font-semibold tracking-tight text-white text-lg">
          AutoAppli
        </span>
      </Link>
      <nav
        aria-label="Primary"
        className="hidden md:flex items-center gap-6 text-sm text-zinc-400"
      >
        <Link href="/about" className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}>
          About
        </Link>
        <Link href="/blog" className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}>
          Blog
        </Link>
        <Link href="/pricing" className={`rounded-md text-white ${FOCUS_RING}`}>
          Pricing
        </Link>
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/login"
          className={`rounded-md text-zinc-400 hover:text-white transition-colors ${FOCUS_RING}`}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className={`rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 ${FOCUS_RING}`}
        >
          Sign up free
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative px-6 pt-20 md:pt-24 pb-10 max-w-4xl mx-auto w-full">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 mb-6">
        <Sparkles aria-hidden="true" className="h-3 w-3" />
        Free during beta. No credit card.
      </div>
      <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05] text-balance">
        Pricing — straight, no asterisks.
      </h1>
      <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed text-pretty">
        Free while I’m building. If paid features come later, the core stays
        free for verified students. No credit card.
      </p>
    </section>
  );
}

function FreeTier() {
  return (
    <section className="px-6 py-12 max-w-4xl mx-auto w-full">
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 via-zinc-900/40 to-zinc-950 p-8 md:p-10 shadow-2xl shadow-blue-500/5">
        <div className="flex flex-wrap items-baseline gap-3 mb-2">
          <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
            Current tier
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-xs text-zinc-400">Everyone, today</span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-5xl md:text-6xl font-bold text-white tracking-tight">
            $0
          </span>
          <span className="text-zinc-400 text-sm">forever for the core</span>
        </div>
        <p className="mt-4 text-zinc-400 leading-relaxed text-pretty max-w-2xl">
          Everything below is free right now. No trial timer, no asterisk that
          turns on a paywall in 14 days, no credit card prompt at signup.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {FREE_TODAY.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-sm text-zinc-200">
              <CheckCircle2
                aria-hidden="true"
                className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400"
              />
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/25 ${FOCUS_RING}`}
          >
            Start your board
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href="/discover"
            className={`inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-zinc-200 hover:border-zinc-500 hover:text-white transition-colors ${FOCUS_RING}`}
          >
            Browse jobs without signing up
          </Link>
        </div>
      </div>
    </section>
  );
}

function MaybePaidLater() {
  return (
    <section className="px-6 py-16 max-w-4xl mx-auto w-full border-t border-zinc-900">
      <div className="max-w-2xl mb-10">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
          What might cost money later
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
          Honest about the maybe-paid list.
        </h2>
        <p className="mt-3 text-zinc-400 leading-relaxed text-pretty">
          If paid features ever roll out, here’s what they probably look
          like — and why each one will still be free for you if you’re a
          verified student.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {MAYBE_PAID.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6"
          >
            <h3 className="font-semibold text-white text-base">{item.title}</h3>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              <span className="text-emerald-300 font-medium">
                Free for verified students.
              </span>{" "}
              {item.why}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-zinc-500 leading-relaxed max-w-2xl">
        Verified student means a working .edu email or a manual check via a
        transcript or enrollment letter. Sent to{" "}
        <a
          href="mailto:hello@autoappli.com"
          className={`rounded-md text-blue-400 hover:underline ${FOCUS_RING}`}
        >
          hello@autoappli.com
        </a>
        . One person reads it. Takes a day at most.
      </p>
    </section>
  );
}

function NotFreemiumTrick() {
  return (
    <section className="px-6 py-16 max-w-3xl mx-auto w-full border-t border-zinc-900">
      <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
        Why this isn’t a freemium trick
      </p>
      <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
        I’m one CS student. The point isn’t to extract money from broke undergrads.
      </h2>
      <div className="mt-8 space-y-5 text-zinc-300 leading-relaxed text-pretty">
        <p>
          I built AutoAppli for my year and the years after me. The point
          isn’t to extract money from broke undergrads — it’s to make
          the internship search less terrible for the people I’ll graduate
          with.
        </p>
        <p>
          If paid tiers happen, they’ll be aimed at adjacent users — career
          changers, bootcamp grads, recruiters who want anonymized data — not
          the student who’s grinding their first internship search. The
          economics work that way; an undergrad with $13 in their checking
          account is not the customer who keeps the lights on.
        </p>
        <p>
          And if something I’m doing today turns into a “feature you
          can no longer access” tomorrow, that’s a broken promise.
          Won’t happen. The list above stays free for students. I’m
          writing it down here so you can hold me to it.
        </p>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section className="px-6 py-20 max-w-3xl mx-auto w-full border-t border-zinc-900">
      <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight text-center mb-3 text-balance">
        Pricing FAQ.
      </h2>
      <p className="text-zinc-400 text-center mb-10">
        Anything else, ping{" "}
        <a
          href="mailto:hello@autoappli.com"
          className={`rounded-md text-blue-400 hover:underline ${FOCUS_RING}`}
        >
          hello@autoappli.com
        </a>
        .
      </p>
      <dl className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800/70 bg-zinc-900/40">
        {FAQ_ITEMS.map((item, i) => (
          <details key={i} className="group px-5 py-4 marker:text-zinc-400">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-zinc-100 font-medium">
              <span>{item.q}</span>
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-45"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 2v12M2 8h12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </summary>
            <dd className="mt-3 text-sm leading-relaxed text-zinc-400">
              {item.a}
            </dd>
          </details>
        ))}
      </dl>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-6 py-24 max-w-5xl mx-auto w-full">
      <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/20 via-zinc-900/60 to-violet-900/20 p-10 md:p-14 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight text-balance">
          Free during beta. Free for verified students after.
        </h2>
        <p className="mt-4 text-zinc-400 max-w-xl mx-auto text-pretty">
          Thirty seconds to first saved job. No credit card.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/signup"
            className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/30 ${FOCUS_RING}`}
          >
            Start your board
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 px-6 py-8 text-xs text-zinc-600">
      <div className="max-w-6xl mx-auto flex flex-wrap gap-4 justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-[10px]"
          >
            A
          </div>
          <span className="text-zinc-500 font-medium">AutoAppli</span>
          <span className="text-zinc-700">
            &copy; {new Date().getFullYear()}
          </span>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/about"
            className={`rounded-md hover:text-zinc-400 transition-colors ${FOCUS_RING}`}
          >
            About
          </Link>
          <Link
            href="/privacy"
            className={`rounded-md hover:text-zinc-400 transition-colors ${FOCUS_RING}`}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className={`rounded-md hover:text-zinc-400 transition-colors ${FOCUS_RING}`}
          >
            Terms
          </Link>
          <a
            href="https://github.com/tarang-tj/AutoAppli"
            target="_blank"
            rel="noopener noreferrer"
            className={`rounded-md hover:text-zinc-400 transition-colors ${FOCUS_RING}`}
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
