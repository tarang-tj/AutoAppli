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

export function PipelineStats({
  jobs,
  allJobCount,
}: {
  jobs: Job[];
  /** Total jobs on the board before search filter (omit when not filtering). */
  allJobCount?: number;
}) {
  if (jobs.length === 0 && (allJobCount === undefined || allJobCount === 0)) {
    return null;
  }

  const filtered =
    allJobCount !== undefined && allJobCount > jobs.length;

  if (jobs.length === 0 && filtered) {
    return (
      <div className="mb-6 rounded-lg border border-amber-600/60 bg-amber-950/40 px-4 py-3">
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
    <div className="mb-6 space-y-2">
      {filtered ? (
        <p className="text-sm font-medium text-amber-200">
          Showing <span className="tabular-nums text-white">{jobs.length}</span> of{" "}
          <span className="tabular-nums text-white">{allJobCount}</span> jobs — clear search to see
          every column.
        </p>
      ) : null}
      <div className="rounded-xl border border-zinc-600/90 bg-zinc-800/90 px-4 py-3 shadow-md shadow-black/30">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-zinc-100">
            <span className="font-bold tabular-nums text-white">{jobs.length}</span>{" "}
            {jobs.length === 1 ? "role" : "roles"}
            {filtered ? " in view" : " on the board"}
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Roles by stage">
            {ORDER.map((status) => {
              const n = counts[status];
              if (n === 0) return null;
              return (
                <li
                  key={status}
                  className={cn(
                    "rounded-md border-2 px-2.5 py-1 text-xs font-semibold",
                    status === "offer" &&
                      "border-emerald-500/90 bg-emerald-950/70 text-emerald-50",
                    status === "interviewing" &&
                      "border-violet-500/90 bg-violet-950/70 text-violet-50",
                    status === "applied" &&
                      "border-blue-500/90 bg-blue-950/70 text-blue-50",
                    status === "bookmarked" &&
                      "border-zinc-500 bg-zinc-900 text-zinc-50",
                    (status === "rejected" || status === "ghosted") &&
                      "border-zinc-500 bg-zinc-900 text-zinc-100"
                  )}
                >
                  <span>{LABELS[status]}</span>{" "}
                  <span className="tabular-nums text-white">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
