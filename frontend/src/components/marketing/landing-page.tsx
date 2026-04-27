import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Kanban,
  Mail,
  Search,
  Sparkles,
  Upload,
  Bookmark,
  Wand2,
  Shield,
  Zap,
  Clock,
} from "lucide-react";
import { TryDemoButton } from "@/components/marketing/try-demo-button";
import ThreeHero from "@/components/marketing/three-hero-wrapper";

/**
 * LandingPage — marketing surface for AutoAppli.
 *
 * Two modes:
 * - `demoMode = true`   — Supabase env is not configured (preview/demo
 *                         builds). Primary CTA opens the app directly.
 * - `demoMode = false`  — Production; show Sign in / Sign up.
 *
 * The page is intentionally self-contained: no external images, no
 * third-party analytics, no blocking scripts. Everything is rendered in
 * CSS so it stays fast and lighthouse-clean.
 */
export function LandingPage({ demoMode = false }: { demoMode?: boolean }) {
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
      <MarketingHeader demoMode={demoMode} />

      <main id="main" className="flex-1">
        <Hero demoMode={demoMode} />
        <TrustBar />
        <AppPreview />
        <HowItWorks />
        <FeatureGrid />
        <Metrics />
        <Testimonial />
        <FAQ />
        <FinalCTA demoMode={demoMode} />
      </main>

      <MarketingFooter />
    </div>
  );
}

// ---- Header --------------------------------------------------------------

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

function MarketingHeader({ demoMode }: { demoMode: boolean }) {
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
          href="/tools"
          className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}
        >
          Tools
        </Link>
        <Link
          href="/interview-practice"
          className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}
        >
          Practice
        </Link>
        <a
          href="#how-it-works"
          className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}
        >
          How it works
        </a>
        <a
          href="#features"
          className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}
        >
          Features
        </a>
        <a
          href="#metrics"
          className={`rounded-md hover:text-white transition-colors ${FOCUS_RING}`}
        >
          Why it works
        </a>
      </nav>
      <div className="flex items-center gap-3 text-sm">
        {!demoMode ? (
          <>
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
          </>
        ) : (
          <Link
            href="/dashboard"
            className={`rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 ${FOCUS_RING}`}
          >
            Open app
          </Link>
        )}
      </div>
    </header>
  );
}

// ---- Hero ---------------------------------------------------------------

function Hero({ demoMode }: { demoMode: boolean }) {
  return (
    <section className="relative px-6 pt-20 md:pt-28 pb-10 max-w-6xl mx-auto w-full">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
        {/* Third blob — subtle emerald wash in the upper-right adds
            depth behind the eyebrow + headline without busy detail. */}
        <div className="absolute top-20 right-20 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 mb-6">
          <Sparkles
            aria-hidden="true"
            className="h-3 w-3 animate-pulse motion-reduce:animate-none"
          />
          Built by a UW Bothell CS junior who ran the grind
        </div>

        <h1 className="font-heading text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05] text-balance">
          The internship grind,{" "}
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">
            minus the tab chaos.
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed text-pretty">
          AutoAppli pulls live jobs from Greenhouse, Lever, Ashby, Indeed, and
          LinkedIn, tailors your resume to the JD in about 30 seconds, and
          tracks every application on a kanban. We don&rsquo;t auto-submit and
          we don&rsquo;t spray. You still click apply. That&rsquo;s the point.
        </p>

        <div className="mt-10 flex flex-wrap gap-3 items-center">
          {demoMode ? (
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 ${FOCUS_RING}`}
            >
              Start your internship board
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 ${FOCUS_RING}`}
              >
                Start your internship board
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <TryDemoButton>Try it without signup</TryDemoButton>
            </>
          )}
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
          <li className="flex items-center gap-1.5">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400" />
            Free demo while I&rsquo;m building
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400" />
            No credit card
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400" />
            We never click apply for you
          </li>
        </ul>
      </div>
    </section>
  );
}

// ---- Trust bar ----------------------------------------------------------

function TrustBar() {
  return (
    <section className="px-6 py-8 border-y border-zinc-900 bg-zinc-950/50">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        <p className="text-xs uppercase tracking-wider text-zinc-600 font-medium">
          Pulls jobs from
        </p>
        {["LinkedIn", "Indeed", "Greenhouse", "Lever", "Ashby", "Workday"].map((s) => (
          <span
            key={s}
            className="text-zinc-500 text-sm font-medium tracking-tight"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

// ---- App preview (CSS mock kanban) -------------------------------------

function AppPreview() {
  return (
    <section
      className="px-6 py-12 max-w-6xl mx-auto w-full"
      aria-label="AutoAppli kanban dashboard preview — mock four-column board with sample job cards"
    >
      {/*
        Entire mock is decorative. Earlier we used role="img" on this wrapper,
        but Safari+VoiceOver still announces children of a labeled image.
        aria-hidden="true" + the section's aria-label guarantees SR users
        hear one summary and skip the fake company names inside.
      */}
      <div
        aria-hidden="true"
        className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-3 shadow-2xl shadow-blue-500/5"
      >
        {/* Fake window chrome */}
        <div className="flex items-center gap-2 px-3 pb-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
          <span className="ml-3 text-[11px] text-zinc-500 font-mono">
            autoappli.app/dashboard
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 overflow-hidden">
          {/* Mock toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-8 rounded-md bg-zinc-900 border border-zinc-800 px-3 flex items-center text-xs text-zinc-500">
              <Search className="h-3 w-3 mr-2" /> Search your board…
            </div>
            <div className="h-8 px-3 rounded-md bg-blue-600 text-white text-xs font-medium flex items-center gap-1">
              <Kanban className="h-3.5 w-3.5" /> Add job
            </div>
          </div>

          {/* Mock kanban columns */}
          <div className="grid grid-cols-4 gap-3">
            <KanbanColumn
              label="Bookmarked"
              count={6}
              tint="text-zinc-400"
              cards={[
                { company: "Spotify", title: "Senior Data Analyst", fit: 92 },
                { company: "Stripe", title: "BI Engineer", fit: 87 },
                { company: "Notion", title: "Product Ops", fit: 71 },
              ]}
            />
            <KanbanColumn
              label="Applied"
              count={4}
              tint="text-blue-400"
              cards={[
                { company: "Linear", title: "Growth Engineer", fit: 84 },
                { company: "Ramp", title: "Data Scientist", fit: 78 },
              ]}
            />
            <KanbanColumn
              label="Interviewing"
              count={2}
              tint="text-amber-400"
              cards={[
                { company: "Figma", title: "Senior Analyst", fit: 90 },
              ]}
            />
            <KanbanColumn
              label="Offer"
              count={1}
              tint="text-emerald-400"
              cards={[
                { company: "Vercel", title: "Data Engineer", fit: 95 },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function KanbanColumn({
  label,
  count,
  tint,
  cards,
}: {
  label: string;
  count: number;
  tint: string;
  cards: { company: string; title: string; fit: number }[];
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className={`text-[10px] uppercase tracking-wide font-semibold ${tint}`}>
          {label}
        </span>
        <span className="text-[10px] text-zinc-600">{count}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {cards.map((c) => (
          <div
            key={c.title}
            className="rounded-md border border-zinc-800 bg-zinc-900 p-2"
          >
            <div className="text-[11px] font-medium text-zinc-100 truncate">
              {c.title}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 truncate">
              {c.company}
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-300 text-[9px] font-semibold px-1.5 py-0.5">
                {c.fit}% fit
              </span>
              <Sparkles className="h-2.5 w-2.5 text-violet-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- How it works -------------------------------------------------------

function HowItWorks() {
  const steps = [
    {
      icon: Bookmark,
      title: "Find",
      body: "Live search pulls from the company ATS boards students actually apply through. Save from LinkedIn with the Chrome extension in one click.",
    },
    {
      icon: Wand2,
      title: "Tailor",
      body: "Point AutoAppli at a JD. It drafts a resume version that matches, plus a cover letter, plus a recruiter outreach message. Thirty seconds. You edit it.",
    },
    {
      icon: Upload,
      title: "Apply (you)",
      body: "Open the company’s apply page. Paste, check, submit. We don’t do this part on purpose. Recruiters can tell when a tool did.",
    },
    {
      icon: Kanban,
      title: "Track",
      body: "Card moves down the kanban. Automation flips statuses when you mark applied, schedule an interview, or get ghosted for 14 days.",
    },
  ];
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 px-6 py-20 max-w-6xl mx-auto w-full"
    >
      <div className="max-w-2xl mb-12">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
          How it works
        </p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
          Find, tailor, track. You hit apply.
        </h2>
        <p className="mt-3 text-zinc-400 leading-relaxed text-pretty">
          No spreadsheets. No 40 open tabs at 1am. One kanban that carries the
          JD, the tailored resume, the cover letter, and the apply timestamp.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-700 transition-colors"
          >
            <div className="absolute -top-3 left-6 h-6 px-2 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center">
              Step {i + 1}
            </div>
            <s.icon aria-hidden="true" className="h-7 w-7 text-blue-400 mb-4" />
            <h3 className="font-semibold text-white text-lg">{s.title}</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Feature grid -------------------------------------------------------

function FeatureGrid() {
  return (
    <section
      id="features"
      className="scroll-mt-20 px-6 py-20 max-w-6xl mx-auto w-full border-t border-zinc-900"
    >
      <div className="max-w-2xl mb-12">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
          What&rsquo;s inside
        </p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
          Eight tools, built for the recruiting calendar.
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={FileText}
          iconColor="text-amber-400"
          title="Resume tailoring"
          description="Paste the JD. Get a resume version tuned to it. Matches skills, keywords, seniority. About 30 seconds per role."
        />
        <FeatureCard
          icon={Search}
          iconColor="text-blue-400"
          title="Live job search"
          description="Firehose pulls from Greenhouse, Lever, Ashby. Deduped, matched against your profile, ranked by fit."
        />
        <FeatureCard
          icon={Bookmark}
          iconColor="text-emerald-400"
          title="Chrome extension"
          description="Save from LinkedIn or any ATS page. One click. Read-only. Does not touch the company’s forms."
        />
        <FeatureCard
          icon={Sparkles}
          iconColor="text-pink-400"
          title="Cover letters"
          description="Generated against the JD, not a template. Edit the draft, don’t start from blank."
        />
        <FeatureCard
          icon={Mail}
          iconColor="text-violet-400"
          title="Outreach drafts"
          description="Recruiter DM drafts that sound like a student, not a sales email. Personalized to the role and the person."
        />
        <FeatureCard
          icon={Kanban}
          iconColor="text-cyan-400"
          title="Kanban tracker"
          description="Every card carries its JD, resume version, cover letter, outreach, and apply timestamp. Mobile-snap."
        />
        <FeatureCard
          icon={CalendarCheck}
          iconColor="text-rose-400"
          title="Interview prep"
          description="Prep mode with a Claude backend. Company overview, likely questions, talking points. PII-redacted by default."
        />
        <FeatureCard
          icon={BarChart3}
          iconColor="text-orange-400"
          title="Match scoring"
          description="Seven-signal explainable fit score. Hover for the breakdown. Not a black box."
        />
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  iconColor,
  title,
  description,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 hover:border-zinc-700 hover:bg-zinc-900/70 [transition:border-color_200ms,background-color_200ms] motion-reduce:transition-none">
      <Icon
        aria-hidden="true"
        className={`h-7 w-7 ${iconColor} mb-3 group-hover:scale-110 transition-transform duration-200 motion-reduce:transition-none motion-reduce:group-hover:scale-100`}
      />
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ---- Metrics / why-it-works --------------------------------------------

function Metrics() {
  const stats = [
    {
      icon: Shield,
      value: "0",
      label: "Applications we submit for you",
      body: "By design. The extension is read-only. The backend has zero browser-automation code. You click apply on the company’s page. Recruiters can tell the difference.",
    },
    {
      icon: Zap,
      value: "~30s",
      label: "Resume tailored per role",
      body: "Paste the JD, get a tuned resume version. You still review every line before it goes out.",
    },
    {
      icon: Clock,
      value: "1-click",
      label: "Save from any supported board",
      body: "Chrome extension pulls the title, company, JD, and URL into your kanban. No spreadsheets, no copy-paste.",
    },
  ];
  return (
    <section
      id="metrics"
      className="scroll-mt-20 px-6 py-20 max-w-6xl mx-auto w-full border-t border-zinc-900"
    >
      <div className="max-w-2xl mb-12">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
          Why it works
        </p>
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-white tracking-tight text-balance">
          The 10 minutes of prep that matters. Not the 30 seconds we could fake.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-zinc-950 p-6"
          >
            <s.icon aria-hidden="true" className="h-6 w-6 text-blue-400 mb-3" />
            <div className="text-4xl font-bold text-white tracking-tight">
              {s.value}
            </div>
            <div className="mt-1 text-sm font-medium text-zinc-200">
              {s.label}
            </div>
            <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Testimonial --------------------------------------------------------

function Testimonial() {
  return (
    <section className="px-6 py-16 max-w-4xl mx-auto w-full">
      <figure className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 md:p-10 text-center">
        <blockquote className="text-lg md:text-xl text-zinc-200 leading-relaxed">
          &ldquo;I applied to about 400 internships last cycle. The ones that
          actually turned into offers were the ones where I had time to tailor
          my resume, not the ones I copy-pasted at 2am. Built AutoAppli so
          next year&rsquo;s me spends that time on the roles that matter.&rdquo;
        </blockquote>
        <figcaption className="mt-6 flex flex-col items-center gap-1">
          <div
            aria-hidden="true"
            className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm"
          >
            T
          </div>
          <div className="text-sm font-medium text-white">Tarang J.</div>
          <div className="text-xs text-zinc-500">
            UW Bothell CS &apos;27 · AutoAppli founder
          </div>
        </figcaption>
      </figure>
    </section>
  );
}

// ---- Final CTA ----------------------------------------------------------

// ---- FAQ ----------------------------------------------------------------

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Does AutoAppli auto-apply for me?",
    a: "No. On purpose. AutoAppli doesn’t submit applications, doesn’t fill forms, doesn’t click apply buttons. Recruiters can tell when a tool did it and it tanks your callback rate. What we do: find the role, tailor your resume and cover letter to it, track it. You open the apply page and submit yourself. We set up the ten minutes of work that matters; we don’t try to fake the last thirty seconds.",
  },
  {
    q: "Why “for students” specifically?",
    a: "I built this while doing my own internship search as a CS junior at UW Bothell. Internship recruiting has a cycle (Sept to Nov for next summer, Jan to Mar for new-grad) and a different rhythm than mid-career search. AutoAppli is tuned for that. Other audiences are welcome; the defaults are set for students.",
  },
  {
    q: "How is this different from LazyApply, Simplify, or Huntr?",
    a: "LazyApply submits for you. We don’t. Simplify autofills any role for any user; we’re vertical on student internship and new-grad. Huntr is a tracker only; we do the prep work (resume tailor, cover letter, outreach) plus tracking. If what you want is to mass-fire 500 applications tonight, we are not the tool.",
  },
  {
    q: "Is AutoAppli really free?",
    a: "Free demo while I’m still building. If I add paid features later, the core stays free for verified students. No credit card, no trial timer, no dark patterns.",
  },
  {
    q: "Which AI model tailors my resume?",
    a: "Anthropic Claude. You can bring your own API key via settings if you prefer to own the billing. All AI calls run through our backend with per-user rate limits; we never train models on your resume.",
  },
  {
    q: "Where does the job data come from?",
    a: "We ingest public job boards nightly (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, WeWorkRemotely) and top off with a live Indeed scrape for long-tail queries. No LinkedIn scraping; no ToS violations.",
  },
  {
    q: "Can I export my data?",
    a: "Any time. CSV, JSON, PDF. Your board, resumes, outreach, and timeline all export from the Export page. We don’t trap your data.",
  },
  {
    q: "What data do you store?",
    a: "Your account email, resumes you upload, jobs you save, outreach messages you draft. Data is stored in Supabase (Postgres) with row-level security. We don’t sell data and we don’t share it with advertisers.",
  },
];

function FAQ() {
  return (
    <section className="px-6 py-20 max-w-3xl mx-auto w-full">
      <h2 className="font-heading text-3xl md:text-4xl font-bold text-white tracking-tight text-center mb-3 text-balance">
        Questions, answered.
      </h2>
      <p className="text-zinc-400 text-center mb-10">
        Everything else, ping{" "}
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
          <details
            key={i}
            className="group px-5 py-4 marker:text-zinc-400"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-zinc-100 font-medium">
              <span>{item.q}</span>
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-45"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </summary>
            <dd className="mt-3 text-sm leading-relaxed text-zinc-400">
              {item.a}
            </dd>
          </details>
        ))}
      </dl>

      {/* FAQPage JSON-LD for rich results on Google. */}
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
              acceptedAnswer: {
                "@type": "Answer",
                text: it.a,
              },
            })),
          }),
        }}
      />
    </section>
  );
}

function FinalCTA({ demoMode }: { demoMode: boolean }) {
  return (
    <section className="px-6 py-24 max-w-5xl mx-auto w-full">
      <div className="relative rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/20 via-zinc-900/60 to-violet-900/20 p-10 md:p-16 text-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-white tracking-tight text-balance">
          Recruiting season&rsquo;s already started somewhere. Set up your board.
        </h2>
        <p className="mt-4 text-zinc-400 max-w-xl mx-auto text-pretty">
          Free demo while I&rsquo;m still building. If paid features come later,
          the core stays free for verified students. No credit card. Thirty
          seconds to first saved job.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          {demoMode ? (
            <Link
              href="/dashboard"
              className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/30 ${FOCUS_RING}`}
            >
              Open the app
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 [transition:background-color_150ms,box-shadow_150ms] shadow-lg shadow-blue-600/30 ${FOCUS_RING}`}
              >
                Start your internship board
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <TryDemoButton>Try the demo</TryDemoButton>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ---- Footer -------------------------------------------------------------

function MarketingFooter() {
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
