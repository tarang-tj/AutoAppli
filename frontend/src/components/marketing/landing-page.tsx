import Link from "next/link";
import { ArrowRight, Kanban, Mail, Search, Sparkles, BarChart3, FileText, CalendarCheck, Users } from "lucide-react";

export function LandingPage({ demoMode = false }: { demoMode?: boolean }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-6 py-4 flex items-center justify-between gap-4 backdrop-blur-sm bg-zinc-950/80 sticky top-0 z-10">
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
                Sign up
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
        <section className="relative px-6 py-20 md:py-32 max-w-5xl mx-auto w-full">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 mb-6">
            <Sparkles className="h-3 w-3" />
            AI-powered job search platform
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] max-w-4xl">
            Your entire job search,{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              one workspace.
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            Search roles, tailor your resume with AI, draft outreach messages, and track every
            application on a visual Kanban board.
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
        </section>

        {/* Feature grid */}
        <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Search}
              iconColor="text-blue-400"
              title="Job Search"
              description="Browse live listings from LinkedIn, Indeed, and more. Filter by location and save to your tracker."
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
              description="Drag-and-drop Kanban board from bookmarked to offer with notes and reordering."
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
      <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
