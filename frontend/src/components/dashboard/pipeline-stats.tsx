"use client";

import type { Job, JobStatus } from "@/types";
import { cn } from "@/lib/utils";

const ORDER: JobStatus[] = [
  "bookmarked",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
];

const LABELS: Record<JobStatus, string> = {
  bookmarked: "Bookmarked",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

const COLOURS: Record<JobStatus, string> = {
  bookmarked: "border-zinc-500 bg-zinc-900 text-zinc-50",
  applied: "border-blue-500/90 bg-blue-950/70 text-blue-50",
  interviewing: "border-violet-500/90 bg-violet-950/70 text-violet-50",
  offer: "border-emerald-500/90 bg-emerald-950/70 text-emerald-50",
  rejected: "border-red-500/60 bg-red-950/40 text-red-200",
  ghosted: "border-zinc-500 bg-zinc-900 text-zinc-100",
};

export function PipelineStats({
  jobs,
  allJobCount,
}: {
  jobs: Job[];
  allJobCount?: number;
}) {
  if (jobs.length === 0 && (allJobCount === undefined || allJobCount === 0)) {
    return null;
  }

  const filtered =
    allJobCount !== undefined && allJobCount > jobs.length;

  if (jobs.length === 0 && filtered) {
    return (
      <div
        className="mb-6 rounded-lg border border-amber-600/60 bg-amber-950/40 px-4 py-3"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-amber-100">
          No jobs match your search — try another keyword or clear the filter.
        </p>
      </div>
    );
  }

  const counts = ORDER.reduce(
    (acc, s) => {
      acc[s] = jobs.filter((j) => j.status === s).length;
      return acc;
    },
    {} as Record<JobStatus, number>
  );

  return (
    <div className="mb-5 space-y-2">
      {filtered ? (
        <p className="text-sm font-medium text-amber-200">
          Showing <span className="tabular-nums text-white">{jobs.length}</span> of{" "}
          <span className="tabular-nums text-white">{allJobCount}</span> jobs — clear search to see
          every column.
        </p>
      ) : null}
      <div className="rounded-xl border border-zinc-700/70 bg-zinc-900/80 px-4 py-3 shadow-md shadow-black/20">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-zinc-200">
            <span className="font-bold tabular-nums text-white">{jobs.length}</span>{" "}
            {jobs.length === 1 ? "role" : "roles"}
            {filtered ? " in view" : " tracked"}
          </p>
          <div className="h-4 w-px bg-zinc-700 hidden sm:block" />
          <ul className="flex flex-wrap gap-1.5" aria-label="Roles by stage">
            {ORDER.map((status) => {
              const n = counts[status];
              if (n === 0) return null;
              return (
                <li
                  key={status}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-semibold tabular-nums [transition:background-color_150ms,border-color_150ms]",
                    COLOURS[status]
                  )}
                >
                  {LABELS[status]} <span className="text-white">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
