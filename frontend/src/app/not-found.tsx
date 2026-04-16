import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
        <Compass className="h-7 w-7 text-blue-400" aria-hidden />
      </div>
      <p className="text-sm font-medium text-zinc-500 tabular-nums">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-white">Page not found</h1>
      <p className="mt-2 max-w-md text-zinc-400 text-sm">
        The link may be broken or the page was removed.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Back to dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium border border-zinc-700 text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
