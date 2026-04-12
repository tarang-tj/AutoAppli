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
