import Link from "next/link";
import { ArrowRight, Check, Minus, X } from "lucide-react";

/**
 * ComparisonPage — shared layout for /vs/<competitor>/ pages.
 *
 * Each /vs/ page is a server component that imports this component and
 * passes a competitor-specific data prop. The page itself owns the
 * `Metadata` export so titles/descriptions stay route-specific.
 *
 * No "use client" — this entire tree is server-rendered. The only
 * interactive piece is the native <details>/<summary> in the FAQ, which
 * needs no client JS.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

// ---- Types --------------------------------------------------------------

export type CellValue = "yes" | "no" | "partial" | "unclear";

export interface ComparisonRow {
  feature: string;
  /** Short note shown under the feature name. Optional. */
  note?: string;
  autoappli: CellValue;
  competitor: CellValue;
  /** Optional per-row footnote rendered beside each cell as a hover title. */
  autoappliNote?: string;
  competitorNote?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface ComparisonPageProps {
  /** "LazyApply", "Simplify", "Huntr" — used in the H1, table header, etc. */
  competitor: string;
  /** "lazyapply" — used for the hero "alternative" line. */
  competitorSlug: string;
  /** H1 heading. Must contain the comparison phrase. */
  heading: string;
  /** Hero sub-paragraph. */
  subheading: string;
  /** Eyebrow tag, e.g. "AutoAppli vs LazyApply". */
  eyebrow: string;
  /** Honest "what each tool does well" callout. */
  whatEachDoesWell: {
    autoappli: string;
    competitor: string;
  };
  /** ~7-9 row table. */
  rows: ComparisonRow[];
  /** Three short prose sections in the order shown above. */
  whenCompetitorMakesSense: {
    title: string;
    body: string;
  };
  whereAutoappliIsDifferent: {
    title: string;
    body: string;
  };
  whatThisMeansForCallbacks: {
    title: string;
    body: string;
    /** A single short student scenario to anchor the argument. */
    studentExample: string;
  };
  faq: FaqItem[];
}

// ---- Component ----------------------------------------------------------

export function ComparisonPage({
  competitor,
  competitorSlug,
  heading,
  subheading,
  eyebrow,
  whatEachDoesWell,
  rows,
  whenCompetitorMakesSense,
  whereAutoappliIsDifferent,
  whatThisMeansForCallbacks,
  faq,
}: ComparisonPageProps) {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col"
      style={{ colorScheme: "dark" }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main" className="flex-1">
        <Hero
          heading={heading}
          subheading={subheading}
          eyebrow={eyebrow}
          competitorSlug={competitorSlug}
        />
        <WhatEachDoesWell
          competitor={competitor}
          whatEachDoesWell={whatEachDoesWell}
        />
        <ComparisonTable competitor={competitor} rows={rows} />
        <ProseSections
          competitor={competitor}
          whenCompetitorMakesSense={whenCompetitorMakesSense}
          whereAutoappliIsDifferent={whereAutoappliIsDifferent}
          whatThisMeansForCallbacks={whatThisMeansForCallbacks}
        />
        <FinalCTA />
        <Faq faq={faq} />
      </main>

      <Footer />

      {/* JSON-LD: FAQPage for rich snippets. */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.a,
              },
            })),
          }),
        }}
      />
    </div>
  );
}

// ---- Header -------------------------------------------------------------

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
        <Link
          href="/#how-it-works"
          className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}
        >
          How it works
        </Link>
        <Link
          href="/#features"
          className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}
        >
          Features
        </Link>
        <Link
          href="/discover"
          className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}
        >
          Discover jobs
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

// ---- Hero ---------------------------------------------------------------

function Hero({
  heading,
  subheading,
  eyebrow,
  competitorSlug,
}: {
  heading: string;
  subheading: string;
  eyebrow: string;
  competitorSlug: string;
}) {
  return (
    <section className="relative px-6 pt-16 md:pt-24 pb-10 max-w-5xl mx-auto w-full">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 mb-6">
        {eyebrow}
      </div>

      <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-[1.1] text-balance">
        {heading}
      </h1>

      <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-3xl leading-relaxed text-pretty">
        {subheading}
      </p>

      <div className="mt-8 flex flex-wrap gap-3 items-center">
        <Link
          href="/signup"
          className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 ${FOCUS_RING}`}
        >
          Start your internship board
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        <Link
          href="/discover"
          className={`inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-5 py-2.5 text-zinc-200 font-medium hover:bg-zinc-900 hover:border-zinc-600 transition-colors ${FOCUS_RING}`}
        >
          Browse live jobs
        </Link>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Searching for a {competitorSlug} alternative? You&rsquo;re in the right
        place. Free demo, no credit card.
      </p>
    </section>
  );
}

// ---- "What each does well" callout -------------------------------------

function WhatEachDoesWell({
  competitor,
  whatEachDoesWell,
}: {
  competitor: string;
  whatEachDoesWell: { autoappli: string; competitor: string };
}) {
  return (
    <section className="px-6 py-10 max-w-5xl mx-auto w-full">
      <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-3">
        Honest take
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-balance mb-6">
        What each tool actually does well.
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-900/10 to-zinc-950 p-5">
          <div className="text-sm font-semibold text-blue-300 mb-2">
            AutoAppli
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {whatEachDoesWell.autoappli}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="text-sm font-semibold text-zinc-200 mb-2">
            {competitor}
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {whatEachDoesWell.competitor}
          </p>
        </div>
      </div>
    </section>
  );
}

// ---- Comparison table ---------------------------------------------------

function Cell({ value, note }: { value: CellValue; note?: string }) {
  const label =
    value === "yes"
      ? "Yes"
      : value === "no"
        ? "No"
        : value === "partial"
          ? "Partial"
          : "Unclear from public info";
  const Icon =
    value === "yes" ? Check : value === "no" ? X : value === "partial" ? Minus : Minus;
  const tint =
    value === "yes"
      ? "text-emerald-400"
      : value === "no"
        ? "text-rose-400"
        : "text-amber-400";

  return (
    <div className="flex items-start gap-2">
      <Icon aria-hidden="true" className={`h-4 w-4 mt-0.5 shrink-0 ${tint}`} />
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${tint}`}>{label}</span>
        {note ? (
          <span className="text-xs text-zinc-500 mt-0.5 leading-snug">{note}</span>
        ) : null}
      </div>
    </div>
  );
}

function ComparisonTable({
  competitor,
  rows,
}: {
  competitor: string;
  rows: ComparisonRow[];
}) {
  return (
    <section className="px-6 py-12 max-w-5xl mx-auto w-full">
      <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-3">
        Feature by feature
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-balance mb-6">
        AutoAppli vs {competitor}, line by line.
      </h2>

      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">
            Side-by-side feature comparison between AutoAppli and {competitor}
          </caption>
          <thead className="border-b border-zinc-800 bg-zinc-900/60">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-400 font-semibold w-[34%]"
              >
                Feature
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs uppercase tracking-wide text-blue-300 font-semibold"
              >
                AutoAppli
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-300 font-semibold"
              >
                {competitor}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {rows.map((row) => (
              <tr key={row.feature} className="align-top">
                <th
                  scope="row"
                  className="px-4 py-4 font-medium text-zinc-100"
                >
                  <div>{row.feature}</div>
                  {row.note ? (
                    <div className="text-xs text-zinc-500 font-normal mt-1 leading-snug">
                      {row.note}
                    </div>
                  ) : null}
                </th>
                <td className="px-4 py-4">
                  <Cell value={row.autoappli} note={row.autoappliNote} />
                </td>
                <td className="px-4 py-4">
                  <Cell value={row.competitor} note={row.competitorNote} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Sourced from each tool&rsquo;s public marketing pages as of April 2026.
        If {competitor} ships a feature we mark &ldquo;unclear&rdquo;, ping
        hello@autoappli.com and we&rsquo;ll update.
      </p>
    </section>
  );
}

// ---- Three prose sections ----------------------------------------------

function ProseSections({
  competitor,
  whenCompetitorMakesSense,
  whereAutoappliIsDifferent,
  whatThisMeansForCallbacks,
}: {
  competitor: string;
  whenCompetitorMakesSense: { title: string; body: string };
  whereAutoappliIsDifferent: { title: string; body: string };
  whatThisMeansForCallbacks: {
    title: string;
    body: string;
    studentExample: string;
  };
}) {
  return (
    <section className="px-6 py-12 max-w-3xl mx-auto w-full space-y-12">
      <article>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-balance">
          {whenCompetitorMakesSense.title}
        </h2>
        <p className="mt-4 text-zinc-400 leading-relaxed text-pretty">
          {whenCompetitorMakesSense.body}
        </p>
      </article>

      <article>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-balance">
          {whereAutoappliIsDifferent.title}
        </h2>
        <p className="mt-4 text-zinc-400 leading-relaxed text-pretty">
          {whereAutoappliIsDifferent.body}
        </p>
      </article>

      <article>
        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-balance">
          {whatThisMeansForCallbacks.title}
        </h2>
        <p className="mt-4 text-zinc-400 leading-relaxed text-pretty">
          {whatThisMeansForCallbacks.body}
        </p>
        <figure className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <blockquote className="text-sm text-zinc-300 leading-relaxed">
            {whatThisMeansForCallbacks.studentExample}
          </blockquote>
          <figcaption className="mt-3 text-xs text-zinc-500">
            — A scenario that plays out every recruiting cycle. Names removed.
          </figcaption>
        </figure>
        <p className="mt-6 text-xs text-zinc-500">
          {competitor} can be the right tool for some shapes of search. For
          college students chasing internships and new-grad roles where
          callback rate matters more than application count, AutoAppli is
          built for the work that actually moves the needle.
        </p>
      </article>
    </section>
  );
}

// ---- Final CTA ----------------------------------------------------------

function FinalCTA() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto w-full">
      <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/20 via-zinc-900/60 to-violet-900/20 p-8 md:p-12 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight text-balance">
          Set up the ten minutes that matter. Hit apply yourself.
        </h2>
        <p className="mt-4 text-zinc-400 max-w-xl mx-auto text-pretty">
          Free demo while we&rsquo;re still building. No credit card. Thirty
          seconds to first saved internship.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/signup"
            className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/30 ${FOCUS_RING}`}
          >
            Start your internship board
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href="/discover"
            className={`inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-zinc-200 font-semibold hover:bg-zinc-900 hover:border-zinc-600 transition-colors ${FOCUS_RING}`}
          >
            Browse live jobs first
          </Link>
        </div>
      </div>
    </section>
  );
}

// ---- FAQ ----------------------------------------------------------------

function Faq({ faq }: { faq: FaqItem[] }) {
  return (
    <section className="px-6 py-16 max-w-3xl mx-auto w-full">
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-center mb-3 text-balance">
        Common questions.
      </h2>
      <p className="text-zinc-400 text-center mb-8 text-sm">
        Anything missing? Email{" "}
        <a
          href="mailto:hello@autoappli.com"
          className={`rounded-md text-blue-400 hover:underline ${FOCUS_RING}`}
        >
          hello@autoappli.com
        </a>
        .
      </p>
      <dl className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800/70 bg-zinc-900/40">
        {faq.map((item, i) => (
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

// ---- Footer -------------------------------------------------------------

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
          <Link
            href="/"
            className={`rounded-md hover:text-zinc-400 transition-colors ${FOCUS_RING}`}
          >
            Home
          </Link>
        </div>
      </div>
    </footer>
  );
}
