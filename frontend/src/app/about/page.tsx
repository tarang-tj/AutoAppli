import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, GitBranch, Sparkles } from "lucide-react";

/**
 * /about — server component.
 *
 * Founder/why story. First person ("I"), matter-of-fact, aimed at
 * trust-building with student readers and AI crawlers.
 */

export const metadata: Metadata = {
  title: "About",
  description:
    "AutoAppli is built by a UW Bothell CS junior who ran the internship grind. About 400 applications, ~6 callbacks, the ones that became offers were tailored. Here's why the product looks the way it does.",
  keywords: [
    "autoappli founder",
    "autoappli about",
    "tarang jammalamadaka",
    "uw bothell cs",
    "student-built internship tracker",
    "why autoappli",
  ],
  alternates: { canonical: "/about" },
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
    type: "profile",
    title: "About AutoAppli — built by a UW Bothell CS junior",
    description:
      "One CS student, a few hundred internship apps, a kanban that grew into a product. The honest founder story behind AutoAppli.",
    url: "/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About AutoAppli — built by a UW Bothell CS junior",
    description:
      "One CS student, a few hundred internship apps, a kanban that grew into a product.",
  },
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

const NOT_LIST: string[] = [
  "Not auto-submitting applications. Recruiters can tell.",
  "Not a coaching service or human marketplace.",
  "Not a community, Discord, or chat product.",
  "Not a paid tier hidden behind a free trial.",
];

export default function AboutPage() {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col"
      style={{ colorScheme: "dark" }}
    >
      <Header />

      <main className="flex-1">
        <Hero />
        <Story />
        <NotSection />
        <WhatsNext />
        <Contact />
        <FinalCTA />
      </main>

      <Footer />

      {/* Person + Organization JSON-LD for richer crawler understanding. */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            mainEntity: {
              "@type": "Person",
              name: "Tarang Jammalamadaka",
              jobTitle: "Founder, AutoAppli",
              alumniOf: {
                "@type": "CollegeOrUniversity",
                name: "University of Washington Bothell",
              },
              description:
                "UW Bothell CS junior building AutoAppli, a job-search workspace for students.",
              email: "hello@autoappli.com",
            },
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
        <Link href="/about" className={`rounded-md text-white ${FOCUS_RING}`}>
          About
        </Link>
        <Link href="/blog" className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}>
          Blog
        </Link>
        <Link href="/pricing" className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}>
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 mb-6">
        <Sparkles aria-hidden="true" className="h-3 w-3" />
        About AutoAppli
      </div>
      <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05] text-balance">
        Built by a UW Bothell CS junior who ran the grind.
      </h1>
      <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed text-pretty">
        AutoAppli is a job-search workspace for college students — internship
        and new-grad. One person built it during their own search, for the
        people they’ll graduate with.
      </p>
    </section>
  );
}

function Story() {
  return (
    <section className="px-6 py-12 max-w-3xl mx-auto w-full">
      <article className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed text-pretty space-y-5">
        <p>
          I’m a CS junior at UW Bothell. I applied to about 400 internships
          last cycle. Roughly 6 callbacks. The ones that became offers were the
          ones I actually tailored — the resume named the team, the cover
          letter named a project, the recruiter outreach didn’t sound like
          a sales blast. Everything else was noise.
        </p>
        <p>
          I built AutoAppli because the tools that exist either spam-fire
          applications — which tanks your callback rate, the math is in the
          blog — or they just track what you’ve already done. Neither
          helps the part that actually moves the rate. I wanted the boring 10
          minutes of prep — resume tailoring, cover letter, recruiter outreach
          — automated, and the actual application left to me.
        </p>
        <p>
          The reason it’s for students specifically is that internship
          recruiting is calendar-driven and that calendar is brutal. Big tech
          opens reqs in August. Mid-size companies in October. Bootcamp-friendly
          shops and quant in January. New-grad runs from September through
          March. Miss a window and you’re reapplying next year. AutoAppli’s
          defaults — the cycle reminders, the ranked job firehose, the kanban
          column structure — are tuned for that calendar. A general-audience
          tool can’t do that without contorting itself.
        </p>
        <p>
          The kanban specifically exists because of one night, spring of
          sophomore year, when I had 23 tabs open trying to remember which
          Stripe role I’d already applied to. I had a Notion table, a
          Google Sheet, a Discord DM with a friend, and somehow they all
          disagreed. I closed the tabs, slept, and the next morning sketched
          what eventually became the dashboard. Bookmarked, applied, interviewing,
          offer. Each card carries the JD, the resume version, the cover letter,
          and the apply timestamp. That’s it. No fancier than that, on
          purpose.
        </p>
        <p>
          The product has a posture, and the posture is: I will not click apply
          for you. The Chrome extension is read-only. The backend has zero
          browser-automation libraries. AutoAppli sets up the prep and you
          submit on the company’s own page. That posture loses some
          potential users — the ones who want a robot — and it’s
          deliberate, because every recruiter I’ve talked to has the same
          line about spotting auto-submitted applications instantly.
        </p>
      </article>
    </section>
  );
}

function NotSection() {
  return (
    <section className="px-6 py-12 max-w-3xl mx-auto w-full border-t border-zinc-900">
      <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
        What AutoAppli is NOT
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-6 text-balance">
        Saying no to the tempting features.
      </h2>
      <ul className="space-y-3">
        {NOT_LIST.map((line) => (
          <li
            key={line}
            className="flex items-start gap-3 rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-200"
          >
            <span aria-hidden="true" className="text-rose-400 font-semibold mt-0.5">
              ×
            </span>
            <span className="leading-relaxed">{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WhatsNext() {
  return (
    <section className="px-6 py-12 max-w-3xl mx-auto w-full border-t border-zinc-900">
      <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
        What’s next
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-6 text-balance">
        Shipping during my own internship grind.
      </h2>
      <p className="text-zinc-300 leading-relaxed text-pretty">
        Recent additions: live multi-source job firehose pulling from public ATS
        boards, an AI practice chat for mock interviews, the read-only Chrome
        extension, and structured match scoring with a transparent breakdown. If
        a feature would have helped me last fall, it gets prioritized. If it
        would have helped me waste time, it doesn’t ship.
      </p>
    </section>
  );
}

function Contact() {
  return (
    <section className="px-6 py-12 max-w-3xl mx-auto w-full border-t border-zinc-900">
      <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
        Contact
      </p>
      <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-6 text-balance">
        One inbox, one person.
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="mailto:hello@autoappli.com"
          className={`group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 hover:bg-zinc-900/70 transition-colors ${FOCUS_RING}`}
        >
          <Mail aria-hidden="true" className="h-5 w-5 text-blue-400" />
          <div>
            <div className="text-sm font-medium text-white">
              hello@autoappli.com
            </div>
            <div className="text-xs text-zinc-500">
              Bug reports, feature requests, student verification
            </div>
          </div>
        </a>
        <a
          href="https://github.com/tarang-tj/AutoAppli"
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 hover:bg-zinc-900/70 transition-colors ${FOCUS_RING}`}
        >
          <GitBranch aria-hidden="true" className="h-5 w-5 text-zinc-300" />
          <div>
            <div className="text-sm font-medium text-white">
              github.com/tarang-tj/AutoAppli
            </div>
            <div className="text-xs text-zinc-500">
              Issues, code, recent commits
            </div>
          </div>
        </a>
      </div>
      <p className="mt-6 text-sm text-zinc-500 leading-relaxed">
        — Tarang Jammalamadaka, UW Bothell CS ’27.
      </p>
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
          Skip the tab chaos. Set up your board.
        </h2>
        <p className="mt-4 text-zinc-400 max-w-xl mx-auto text-pretty">
          Free during beta. No credit card. Thirty seconds to first saved job.
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
            href="/pricing"
            className={`rounded-md hover:text-zinc-400 transition-colors ${FOCUS_RING}`}
          >
            Pricing
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
