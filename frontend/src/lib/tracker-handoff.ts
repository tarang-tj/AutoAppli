/**
 * One-shot handoff from the job tracker (Kanban) to Resume or Outreach pages.
 * Uses sessionStorage so it survives client navigation without query-string limits.
 */

import type { Job } from "@/types";

const RESUME_KEY = "autoappli-handoff-resume-v1";
const OUTREACH_KEY = "autoappli-handoff-outreach-v1";
const MAX_DESC = 48_000;

export type TrackerResumeHandoff = {
  v: 1;
  title: string;
  company: string;
  description: string;
  url?: string;
};

export type TrackerOutreachHandoff = {
  v: 1;
  jobTitle: string;
  company: string;
  jobContext: string;
};

function clip(s: string): string {
  if (s.length <= MAX_DESC) return s;
  return `${s.slice(0, MAX_DESC)}\n\n… (truncated for browser storage)`;
}

function buildJdBlock(job: Job): string {
  const title = (job.title ?? "").trim() || "Role";
  const company = (job.company ?? "").trim() || "Company";
  const desc = (job.description ?? "").trim();
  const url = (job.url ?? "").trim();

  const header = `${title} — ${company}`;
  if (desc) {
    return `${header}\n\n${clip(desc)}`;
  }
  if (url) {
    return `${header}\n\n(No full description saved in your tracker.)\nPosting: ${url}\n\nPaste the job description from the posting page, or re-save the job with “import full description”.`;
  }
  return `${header}\n\nPaste the job description from the posting here.`;
}

export function storeResumeHandoffFromJob(job: Job): void {
  try {
    const payload: TrackerResumeHandoff = {
      v: 1,
      title: (job.title ?? "").trim(),
      company: (job.company ?? "").trim(),
      description: buildJdBlock(job),
      url: job.url?.trim() || undefined,
    };
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function consumeResumeHandoff(): TrackerResumeHandoff | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RESUME_KEY);
    const o = JSON.parse(raw) as TrackerResumeHandoff;
    if (o?.v !== 1 || typeof o.description !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function storeOutreachHandoffFromJob(job: Job): void {
  try {
    const payload: TrackerOutreachHandoff = {
      v: 1,
      jobTitle: (job.title ?? "").trim(),
      company: (job.company ?? "").trim(),
      jobContext: buildJdBlock(job),
    };
    sessionStorage.setItem(OUTREACH_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function consumeOutreachHandoff(): TrackerOutreachHandoff | null {
  try {
    const raw = sessionStorage.getItem(OUTREACH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OUTREACH_KEY);
    const o = JSON.parse(raw) as TrackerOutreachHandoff;
    if (o?.v !== 1 || typeof o.jobContext !== "string") return null;
    return o;
  } catch {
    return null;
  }
}
