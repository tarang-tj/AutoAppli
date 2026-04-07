import Link from "next/link";
import { ArrowRight, Kanban, Mail, Search, Sparkles } from "lucide-react";

export function LandingPage({ demoMode = false }: { demoMode?: boolean }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between gap-4">
        <span className="font-semibold tracking-tight text-white">AutoAppli</span>
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
                className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 transition-colors"
              >
                Sign up
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 transition-colors"
            >
              Open app
            </Link>
          )}
        </nav>
      </header>

      <main className="flex-1 px-6 py-16 md:py-24 max-w-5xl mx-auto w-full">
        <p className="text-sm font-medium text-blue-400 mb-4">AI job application workspace</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight max-w-3xl">
          Search roles, tailor your resume, and track every application in one place.
        </h1>
        <p className="mt-6 text-lg text-zinc-400 max-w-2xl leading-relaxed">
          AutoAppli combines job search, Claude-powered resume generation, outreach drafts, and a
          Kanban pipeline so you spend less time on tooling and more time interviewing.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          {demoMode ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Try the app (demo)
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 px-5 py-3 text-zinc-200 font-medium hover:bg-zinc-900 transition-colors"
              >
                Sign in
              </Link>
            </>
          )}
        </div>

        <ul className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <Search className="h-8 w-8 text-blue-400 mb-3" />
            <h2 className="font-semibold text-white">Job search</h2>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Scrape live listings, filter remote roles, and save searches to your tracker.
            </p>
          </li>
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <Sparkles className="h-8 w-8 text-amber-400 mb-3" />
            <h2 className="font-semibold text-white">Resume builder</h2>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Upload a PDF, paste a job description, and generate a tailored resume with AI review.
            </p>
          </li>
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <Mail className="h-8 w-8 text-emerald-400 mb-3" />
            <h2 className="font-semibold text-white">Outreach</h2>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Draft LinkedIn and email messages matched to the role and company.
            </p>
          </li>
          <li className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <Kanban className="h-8 w-8 text-violet-400 mb-3" />
            <h2 className="font-semibold text-white">Pipeline</h2>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Kanban columns from bookmarked to offer, with notes and reordering.
            </p>
          </li>
        </ul>
      </main>

      <footer className="border-t border-zinc-800/80 px-6 py-6 text-xs text-zinc-600 flex flex-wrap gap-4 justify-center">
        <Link href="/privacy" className="hover:text-zinc-400">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-zinc-400">
          Terms
        </Link>
      </footer>
    </div>
  );
}
