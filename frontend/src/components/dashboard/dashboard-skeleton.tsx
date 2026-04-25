import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton shown while the dashboard is mounting (inside Suspense) and
 * while useJobs() is fetching. Matches the real layout closely enough
 * that the swap doesn't cause a jarring reflow.
 */
export function DashboardSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Search / filter bar */}
      <Skeleton className="h-10 w-full sm:w-96" />

      {/* Kanban columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, col) => (
          <div
            key={col}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <Skeleton className="mb-3 h-4 w-28" />
            <div className="space-y-2">
              {Array.from({ length: 2 + ((col * 3) % 3) }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3"
                >
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
          >
            <Skeleton className="mb-3 h-4 w-32" />
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
