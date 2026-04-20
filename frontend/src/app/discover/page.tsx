/**
 * /discover — public + signed-in surface for the cached_jobs firehose.
 *
 * Reads come straight from Supabase (RLS allows anon + authenticated SELECT)
 * via @/hooks/use-cached-jobs. Writes (the "save to kanban" action) require
 * a Supabase session and copy the row into the user's `jobs` table through
 * @/lib/supabase/jobs::createJob. If the user isn't signed in we surface a
 * friendly inline prompt rather than redirecting — they should still be
 * able to browse openings.
 *
 * The page lives outside the (app)/dashboard layout so it can render for
 * signed-out visitors. We wrap the client view in <Suspense> so Next can
 * stream the chrome before the cached_jobs request completes.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import { DiscoverClient } from "./discover-client";

export const metadata: Metadata = {
  title: "Discover Jobs · AutoAppli",
  description:
    "Browse a curated firehose of remote and on-site engineering, design, and product roles refreshed daily. Save listings to your AutoAppli kanban with one click.",
  alternates: { canonical: "/discover" },
};

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={<DiscoverSkeleton />}>
        <DiscoverClient />
      </Suspense>
    </div>
  );
}

/**
 * Static skeleton used while the client view boots. Doesn't try to mimic
 * the cached_jobs grid because we don't know the result shape yet — just
 * enough chrome so the page doesn't pop in.
 */
function DiscoverSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-6 h-8 w-64 animate-pulse rounded-md bg-zinc-900" />
      <div className="mb-3 h-4 w-96 animate-pulse rounded-md bg-zinc-900/60" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="h-[500px] animate-pulse rounded-xl bg-zinc-900/40" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl bg-zinc-900/40"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
