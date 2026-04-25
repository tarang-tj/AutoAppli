import Link from "next/link";

/**
 * Shared header + footer for blog routes. Mirrors the marketing-page
 * chrome (logo, primary nav, sign-in/up CTAs) so the blog feels like
 * the same surface as the landing and /vs/ pages.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

export function BlogHeader() {
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
          href="/blog"
          className={`rounded-md text-white transition-colors ${FOCUS_RING}`}
        >
          Blog
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

export function BlogFooter({ maxWidth = "max-w-4xl" }: { maxWidth?: string }) {
  return (
    <footer className="border-t border-zinc-800/60 px-6 py-10 text-sm text-zinc-500">
      <div
        className={`${maxWidth} mx-auto flex flex-wrap items-center justify-between gap-4`}
      >
        <p>© {new Date().getFullYear()} AutoAppli</p>
        <div className="flex items-center gap-5">
          <Link href="/" className={`hover:text-zinc-300 ${FOCUS_RING}`}>
            Home
          </Link>
          <Link href="/blog" className={`hover:text-zinc-300 ${FOCUS_RING}`}>
            Blog
          </Link>
          <Link
            href="/privacy"
            className={`hover:text-zinc-300 ${FOCUS_RING}`}
          >
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
