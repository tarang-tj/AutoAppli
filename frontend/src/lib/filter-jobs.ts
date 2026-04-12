import type { Job } from "@/types";

/** Case-insensitive match on title, company, notes, description, source, location, skills, tags, department, remote_type, job_type. */
export function filterJobsByQuery(jobs: Job[], raw: string): Job[] {
  const q = raw.trim().toLowerCase();
  if (!q) return jobs;
  return jobs.filter((j) => {
    const parts = [
      j.title,
      j.company,
      j.notes,
      j.description,
      j.source,
      j.url,
      j.location,
      j.department,
      j.remote_type,
      j.job_type,
      ...(j.skills ?? []),
      ...(j.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return parts.includes(q);
  });
}
