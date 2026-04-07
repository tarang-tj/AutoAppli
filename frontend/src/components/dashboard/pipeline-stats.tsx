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

export function PipelineStats({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) return null;

  const counts = ORDER.reduce(
    (acc, s) => {
      acc[s] = jobs.filter((j) => j.status === s).length;
      return acc;
    },
    {} as Record<JobStatus, number>
  );

  return (
    <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-zinc-200">{jobs.length}</span>{" "}
          {jobs.length === 1 ? "role" : "roles"} on the board
        </p>
        <ul className="flex flex-wrap gap-2">
          {ORDER.map((status) => {
            const n = counts[status];
            if (n === 0) return null;
            return (
              <li
                key={status}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs",
                  status === "offer" && "border-emerald-800/80 text-emerald-300/90",
                  status === "interviewing" && "border-violet-800/80 text-violet-300/90",
                  status === "applied" && "border-blue-800/80 text-blue-300/90",
                  status === "bookmarked" && "border-zinc-700 text-zinc-400",
                  (status === "rejected" || status === "ghosted") &&
                    "border-zinc-700 text-zinc-500"
                )}
              >
                {LABELS[status]} <span className="text-zinc-300">{n}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
