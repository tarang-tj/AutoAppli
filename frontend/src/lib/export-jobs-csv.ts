import type { Job } from "@/types";

function csvCell(s: string | undefined | null): string {
  const v = (s ?? "").replace(/"/g, '""');
  if (/[",\n\r]/.test(v)) return `"${v}"`;
  return v;
}

export function jobsToCsv(jobs: Job[]): string {
  const headers = [
    "title",
    "company",
    "status",
    "source",
    "url",
    "location",
    "remote_type",
    "job_type",
    "experience_level",
    "salary_min",
    "salary_max",
    "salary_currency",
    "priority",
    "skills",
    "tags",
    "department",
    "deadline",
    "recruiter_name",
    "application_email",
    "next_step",
    "next_step_date",
    "notes",
    "created_at",
    "updated_at",
  ];
  const lines = [
    headers.join(","),
    ...jobs.map((j) =>
      [
        csvCell(j.title),
        csvCell(j.company),
        csvCell(j.status),
        csvCell(j.source),
        csvCell(j.url),
        csvCell(j.location),
        csvCell(j.remote_type),
        csvCell(j.job_type),
        csvCell(j.experience_level),
        csvCell(j.salary_min != null ? String(j.salary_min) : ""),
        csvCell(j.salary_max != null ? String(j.salary_max) : ""),
        csvCell(j.salary_currency),
        csvCell(j.priority != null ? String(j.priority) : ""),
        csvCell((j.skills ?? []).join("; ")),
        csvCell((j.tags ?? []).join("; ")),
        csvCell(j.department),
        csvCell(j.deadline),
        csvCell(j.recruiter_name),
        csvCell(j.application_email),
        csvCell(j.next_step),
        csvCell(j.next_step_date),
        csvCell(j.notes),
        csvCell(j.created_at),
        csvCell(j.updated_at),
      ].join(",")
    ),
  ];
  return lines.join("\r\n");
}

export function downloadJobsCsv(jobs: Job[], filename = "autoappli-jobs.csv"): void {
  const csv = jobsToCsv(jobs);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
