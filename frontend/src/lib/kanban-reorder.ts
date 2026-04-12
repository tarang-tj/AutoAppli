import type { Job, JobStatus } from "@/types";

/** Column order used for sorting the flat job list (matches Kanban left → right). */
export const KANBAN_COLUMN_ORDER: JobStatus[] = [
  "bookmarked",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
];

const statusRank = new Map<JobStatus, number>(
  KANBAN_COLUMN_ORDER.map((s, i) => [s, i])
);

/** Stable sort for dashboard: column order, then sort_order, then created_at. */
export function sortJobsKanbanOrder(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const ra = statusRank.has(a.status) ? statusRank.get(a.status)! : 0;
    const rb = statusRank.has(b.status) ? statusRank.get(b.status)! : 0;
    if (ra !== rb) return ra - rb;
    const oa = a.sort_order ?? 0;
    const ob = b.sort_order ?? 0;
    if (oa !== ob) return oa - ob;
    return a.created_at.localeCompare(b.created_at);
  });
}

/** Reorder jobs that share a status while preserving positions of other jobs in the flat list. */
export function reorderJobsWithinStatus(
  jobs: Job[],
  status: JobStatus,
  fromIndex: number,
  toIndex: number
): Job[] {
  const inColumn = jobs.filter((j) => j.status === status);
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return jobs;
  if (fromIndex >= inColumn.length || toIndex >= inColumn.length) return jobs;

  const nextColumn = [...inColumn];
  const [removed] = nextColumn.splice(fromIndex, 1);
  nextColumn.splice(toIndex, 0, removed);

  let i = 0;
  return jobs.map((j) => (j.status === status ? nextColumn[i++] : j));
}
