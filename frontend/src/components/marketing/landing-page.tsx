import Link from "next/link";
import {
  ArrowRight,
  Kanban,
  Mail,
  Search,
  Sparkles,
  BarChart3,
  FileText,
  CalendarCheck,
  Users,
  Zap,
  Shield,
  Clock,
  CheckCircle2,
} from "lucide-react";

export function LandingPage({ demoMode = false }: { demoMode?: boolean }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-4 sm:px-6 py-4 flex items-center justify-between gap-4 backdrop-blur-sm bg-zinc-950/80 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
            A
          </div>
          <span className="font-semibold tracking-tight text-white text-lg">AutoAppli</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
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
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative px-4 sm:px-6 py-16 md:py-32 max-w-5xl mx-auto w-full">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
            <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-6">
            <Sparkles className="h-3 w-3" />
            AI-powered job search automation
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl">
            Land your next role{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              faster.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            Search 300+ live job listings, tailor your resume with AI, generate cover letters and outreach
            messages, and track every application on a visual Kanban board — all in one workspace.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
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
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-zinc-200 font-medium hover:bg-zinc-900 hover:border-zinc-600 transition-all"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>

          {/* Trust indicators */}
          <div className="mt-10 sm:mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" />
              Free to use
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              AI-powered by Claude
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-500" />
              Set up in 2 minutes
            </span>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-16 border-t border-zinc-800/50">
          <div className="max-w-5xl mx-auto w-full">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              How it works
            </h2>
            <p className="text-zinc-400 text-center mb-12 max-w-2xl mx-auto">
              Go from searching to interviewing in three simple steps.
            </p>
            <div className="grid gap-8 sm:grid-cols-3">
              <StepCard
                step={1}
                title="Find & save jobs"
                description="Search live listings from Adzuna or paste any job URL. Save roles to your Kanban board with one click."
              />
              <StepCard
                step={2}
                title="AI tailors your docs"
                description="Upload your resume and let AI optimize it for each role. Generate matching cover letters and outreach messages."
              />
              <StepCard
                step={3}
                title="Track & prepare"
                description="Move applications through your pipeline, get AI interview prep, and track contacts and follow-ups."
              />
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="px-6 py-16 border-t border-zinc-800/50">
          <div className="max-w-5xl mx-auto w-full">
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              Everything you need to land the job
            </h2>
            <p className="text-zinc-400 text-center mb-12 max-w-2xl mx-auto">
              A complete toolkit that replaces spreadsheets, bookmarks, and scattered notes.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={Search}
                iconColor="text-blue-400"
                title="Job Search"
                description="Browse live listings from Adzuna with filters for location, job type, and experience level."
              />
              <FeatureCard
                icon={FileText}
                iconColor="text-amber-400"
                title="Resume Builder"
                description="Upload your resume, paste a job description, and get an AI-tailored version with ATS scoring."
              />
              <FeatureCard
                icon={Mail}
                iconColor="text-emerald-400"
                title="Outreach"
                description="Generate cold emails and LinkedIn messages matched to the role and company."
              />
              <FeatureCard
                icon={Kanban}
                iconColor="text-violet-400"
                title="Pipeline"
                description="Drag-and-drop Kanban board from bookmarked to offer with notes, priority, and tags."
              />
              <FeatureCard
                icon={CalendarCheck}
                iconColor="text-rose-400"
                title="Interview Prep"
                description="AI-generated prep materials with company overview, talking points, and likely questions."
              />
              <FeatureCard
                icon={BarChart3}
                iconColor="text-cyan-400"
                title="Analytics"
                description="Funnel visualization, conversion rates, response metrics, and weekly activity trends."
              />
              <FeatureCard
                icon={Users}
                iconColor="text-orange-400"
                title="Contacts CRM"
                description="Track recruiters and hiring managers with relationship types and interaction history."
              />
              <FeatureCard
                icon={Sparkles}
                iconColor="text-pink-400"
                title="Cover Letters"
                description="Generate tailored cover letters in multiple tones with one-click copy and download."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 border-t border-zinc-800/50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Stop juggling spreadsheets.
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
              AutoAppli brings your entire job search into one workspace so you can focus on
              what matters — landing interviews and getting offers.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href={demoMode ? "/dashboard" : "/signup"}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-8 py-3.5 text-white font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 text-lg"
              >
                {demoMode ? "Open the app" : "Get started free"}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                No credit card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Works with any resume
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                AI tailoring in seconds
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800/50 px-6 py-6 text-xs text-zinc-600 flex flex-wrap gap-4 justify-center">
        <Link href="/privacy" className="hover:text-zinc-400 transition-colors">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-zinc-400 transition-colors">
          Terms
        </Link>
        <span className="text-zinc-700">&copy; {new Date().getFullYear()} AutoAppli</span>
      </footer>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-lg mb-4">
        {step}
      </div>
      <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>
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
      <Icon className={`h-7 w-7 ${iconColor} mb-3 group-hover:scale-110 transition-transform duration-200`} />
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
