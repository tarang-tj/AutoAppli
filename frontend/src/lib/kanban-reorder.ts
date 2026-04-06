import type { Job, JobStatus } from "@/types";

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
