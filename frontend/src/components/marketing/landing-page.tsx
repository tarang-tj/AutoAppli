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
  Users,
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <MarketingHeader demoMode={demoMode} />

      <main className="flex-1">
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

function MarketingHeader({ demoMode }: { demoMode: boolean }) {
  return (
    <header className="border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between gap-4 backdrop-blur-sm bg-zinc-950/80 sticky top-0 z-10">
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
          A
        </div>
        <span className="font-semibold tracking-tight text-white text-lg">
          AutoAppli
        </span>
      </Link>
      <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
        <a href="#how-it-works" className="hover:text-white transition-colors">
          How it works
        </a>
        <a href="#features" className="hover:text-white transition-colors">
          Features
        </a>
        <a href="#metrics" className="hover:text-white transition-colors">
          Why it works
        </a>
      </nav>
      <div className="flex items-center gap-3 text-sm">
        {!demoMode ? (
          <>
            <Link
              href="/login"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Sign up free
            </Link>
          </>
        ) : (
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
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
      </div>

      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300 mb-6">
          <Sparkles className="h-3 w-3" />
          AI-powered job search, built for 2026
        </div>

        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05]">
          Your entire job search,{" "}
          <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-violet-400 bg-clip-text text-transparent">
            one workspace.
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          Save roles from anywhere, tailor your resume with AI in 30 seconds,
          draft outreach messages, and track every application on a Kanban
          board that actually feels good to use.
        </p>

        <div className="mt-10 flex flex-wrap gap-3 items-center">
          {demoMode ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
            >
              Try the app
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <TryDemoButton />
            </>
          )}
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Free forever tier
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            No credit card required
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Your data stays yours
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
          Sources supported
        </p>
        {["LinkedIn", "Indeed", "Greenhouse", "Lever", "Ashby"].map((s) => (
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
    <section className="px-6 py-12 max-w-6xl mx-auto w-full">
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-3 shadow-2xl shadow-blue-500/5">
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
      icon: Upload,
      title: "Upload your resume",
      body: "Drop a PDF or paste your LinkedIn. We parse skills, experience, and seniority automatically.",
    },
    {
      icon: Bookmark,
      title: "Save jobs that fit",
      body: "Browse live listings or paste any URL — we grade the match against your resume in real time.",
    },
    {
      icon: Wand2,
      title: "Tailor & apply",
      body: "One click generates a tailored resume + cover letter. Track every application on a Kanban board.",
    },
  ];
  return (
    <section id="how-it-works" className="px-6 py-20 max-w-6xl mx-auto w-full">
      <div className="max-w-2xl mb-12">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
          How it works
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          From resume to offer in one loop.
        </h2>
        <p className="mt-3 text-zinc-400 leading-relaxed">
          No more spreadsheets. No more 12 browser tabs. Every step of your
          search lives in one fast, keyboard-friendly workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-700 transition-colors"
          >
            <div className="absolute -top-3 left-6 h-6 px-2 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center">
              Step {i + 1}
            </div>
            <s.icon className="h-7 w-7 text-blue-400 mb-4" />
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
      className="px-6 py-20 max-w-6xl mx-auto w-full border-t border-zinc-900"
    >
      <div className="max-w-2xl mb-12">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
          Everything you need
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Eight tools, one workspace.
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureCard
          icon={Search}
          iconColor="text-blue-400"
          title="Job Search"
          description="Live listings from LinkedIn, Indeed, Greenhouse, Lever, and Ashby. Filter by skills, location, and fit score."
        />
        <FeatureCard
          icon={FileText}
          iconColor="text-amber-400"
          title="Resume Builder"
          description="Upload your resume, paste a job, and get an AI-tailored version with ATS scoring in under 30 seconds."
        />
        <FeatureCard
          icon={Mail}
          iconColor="text-emerald-400"
          title="Outreach"
          description="Generate cold emails and LinkedIn messages matched to the role, company, and your own voice."
        />
        <FeatureCard
          icon={Kanban}
          iconColor="text-violet-400"
          title="Pipeline"
          description="Drag-and-drop Kanban from bookmarked to offer. Reorder within columns. Notes on every card."
        />
        <FeatureCard
          icon={CalendarCheck}
          iconColor="text-rose-400"
          title="Interview Prep"
          description="AI-generated prep with company overview, likely questions, and talking points tailored to the role."
        />
        <FeatureCard
          icon={BarChart3}
          iconColor="text-cyan-400"
          title="Analytics"
          description="Funnel visualization, conversion rates by stage, response metrics, and weekly activity trends."
        />
        <FeatureCard
          icon={Users}
          iconColor="text-orange-400"
          title="Contacts CRM"
          description="Track recruiters and hiring managers with relationship types and full interaction history."
        />
        <FeatureCard
          icon={Sparkles}
          iconColor="text-pink-400"
          title="Cover Letters"
          description="Tailored cover letters in multiple tones — formal, conversational, bold — one-click copy and download."
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
    <div className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all duration-200">
      <Icon
        className={`h-7 w-7 ${iconColor} mb-3 group-hover:scale-110 transition-transform duration-200`}
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
      icon: Zap,
      value: "30s",
      label: "Resume tailored per role",
      body: "From paste to polished PDF in under a minute. Tested across 500+ postings.",
    },
    {
      icon: Clock,
      value: "3×",
      label: "More applications per week",
      body: "Users self-report tripling their weekly application output in their first month.",
    },
    {
      icon: Shield,
      value: "0",
      label: "Data sold or shared",
      body: "Your resume, jobs, and contacts are yours. Export everything as CSV any time.",
    },
  ];
  return (
    <section
      id="metrics"
      className="px-6 py-20 max-w-6xl mx-auto w-full border-t border-zinc-900"
    >
      <div className="max-w-2xl mb-12">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2">
          Why it works
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Built for the way modern job searches actually go.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/50 to-zinc-950 p-6"
          >
            <s.icon className="h-6 w-6 text-blue-400 mb-3" />
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
          &ldquo;I went from 4 applications a week on a messy Notion table to
          18 well-targeted ones with tailored resumes. Got two offers in six
          weeks. This is the job-search tool I wish existed a decade ago.&rdquo;
        </blockquote>
        <figcaption className="mt-6 flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            M
          </div>
          <div className="text-sm font-medium text-white">Maya R.</div>
          <div className="text-xs text-zinc-500">
            Data Analyst · moved to a Series-C fintech
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
    q: "Is AutoAppli really free?",
    a: "Yes — the core tracker, search, and AI tooling are free forever. A paid Pro tier is coming with unlimited AI generations and team workspaces, but everything shown above works on the free plan with no credit card.",
  },
  {
    q: "Does AutoAppli auto-apply to jobs?",
    a: "No. We believe auto-applying gets you filtered out. AutoAppli shortens every manual step — tailoring a resume in 30 seconds instead of 30 minutes, drafting personalised outreach, tracking every application on one board — so you can apply thoughtfully to more roles.",
  },
  {
    q: "Which AI model tailors my resume?",
    a: "Anthropic Claude (Sonnet). You can bring your own API key via settings if you prefer to own the billing. All AI calls run through our backend with per-user rate limits; we never train models on your resume.",
  },
  {
    q: "Where does the job data come from?",
    a: "We ingest public job boards nightly — Greenhouse, Lever, Ashby, Workable, SmartRecruiters, WeWorkRemotely — and top off with a live Indeed scrape for long-tail queries. No LinkedIn scraping; no ToS violations.",
  },
  {
    q: "Can I export my data?",
    a: "Any time. CSV, JSON, PDF — your board, resumes, outreach, and timeline all export from the Export page. We don't trap your data.",
  },
  {
    q: "What data do you store?",
    a: "Your account email, resumes you upload, jobs you save, outreach messages you draft. Data is stored in Supabase (Postgres) with row-level security. We don't sell data and we don't share it with advertisers.",
  },
];

function FAQ() {
  return (
    <section className="px-6 py-20 max-w-3xl mx-auto w-full">
      <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight text-center mb-3">
        Questions, answered.
      </h2>
      <p className="text-zinc-400 text-center mb-10">
        Everything else — ping{" "}
        <a
          href="mailto:hello@autoappli.com"
          className="text-blue-400 hover:underline"
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
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
          Your next role is one workspace away.
        </h2>
        <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
          Free forever tier, no credit card, export anything. Takes 60 seconds
          to set up.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          {demoMode ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30"
            >
              Open the app
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
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
          <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-[10px]">
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
            className="hover:text-zinc-400 transition-colors"
          >
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-400 transition-colors">
            Terms
          </Link>
          <a
            href="https://github.com/tarang-tj/AutoAppli"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-400 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
