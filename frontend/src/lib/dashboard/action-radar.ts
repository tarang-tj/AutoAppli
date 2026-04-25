/**
 * Action Radar — pure scoring/ranking for the dashboard widget.
 *
 * Scans a user's `jobs` array and surfaces the most-actionable next steps.
 * Three categories:
 *   - "closing-soon"   bookmarked jobs with a `deadline` <= 7d away, or
 *                     bookmarked > 14d ago without applying (rolling roles).
 *   - "follow-up"      `status === "applied"` and `applied_at` > 10d ago
 *                     with no movement past "applied".
 *   - "prep-interview" `status === "interviewing"` with a parseable date in
 *                     `next_step_date` (preferred) or `next_step` (fallback).
 *
 * Pure: no Date.now()/Math.random() inside the function body — the caller
 * passes `now` (defaults to Date.now() at call time, not module load).
 */
import type { Job } from "@/types";

export type ActionType = "closing-soon" | "follow-up" | "prep-interview";

export interface RadarAction {
  /** Job id — used as React key and to wire ?jobId= deep links. */
  id: string;
  type: ActionType;
  jobTitle: string;
  company: string;
  /** Terse human-readable explanation, e.g. "Closes in 2 days". */
  reason: string;
  /** closing-soon: days until deadline (negative = past). */
  daysUntil?: number;
  /** follow-up: days since applied_at. */
  daysSince?: number;
  /** prep-interview: ISO date or freeform string from next_step_date/next_step. */
  scheduledFor?: string;
  /** 0-100; higher = more urgent. */
  urgency: number;
  ctaLabel: string;
  ctaHref: string;
}

export interface RadarSnapshot {
  /** Top 3 (or fewer if fewer candidates). */
  actions: RadarAction[];
  /** How many candidate actions exist in total — used for "+N more" hint. */
  totalAvailable: number;
  /** Snapshot timestamp; useful for debug logging and tests. */
  generatedAt: number;
}

const DAY = 86_400_000;
const TIE_BREAK: Record<ActionType, number> = {
  "closing-soon": 0,
  "follow-up": 1,
  "prep-interview": 2,
};

function parseDate(x?: string | null): number | null {
  if (!x) return null;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function daysBetween(future: number, now: number): number {
  // Positive when `future` is ahead of `now`. Floor so "today" reads as 0.
  return Math.floor((future - now) / DAY);
}

/**
 * Try to extract a date from `next_step_date` first, then `next_step`.
 * Returns the raw string used (for display) and a parsed timestamp when
 * we could read one, or null when nothing parseable was found.
 */
function extractInterviewWhen(
  job: Job,
  now: number,
): { display: string; ts: number | null } | null {
  const direct = parseDate(job.next_step_date);
  if (direct !== null) {
    return { display: job.next_step_date as string, ts: direct };
  }
  if (job.next_step) {
    const t = parseDate(job.next_step);
    if (t !== null) return { display: job.next_step, ts: t };
    // Freeform — surface the text but no urgency boost from date.
    return { display: job.next_step, ts: null };
  }
  // No explicit step; if status === "interviewing" we still surface a generic
  // "Prep" action so the user has a nudge to open prep materials.
  void now;
  return null;
}

function buildClosingSoon(job: Job, now: number): RadarAction | null {
  const deadline = parseDate(job.deadline);
  if (deadline !== null) {
    const daysUntil = daysBetween(deadline, now);
    if (daysUntil > 7) return null;
    // Past-deadline still surfaces (maybe they missed it / extended).
    const urgencyRaw = 100 - daysUntil * 12;
    const urgency = clamp(urgencyRaw, 0, 100);
    const reason =
      daysUntil < 0
        ? `Closed ${Math.abs(daysUntil)}d ago`
        : daysUntil === 0
          ? "Closes today"
          : `Closes in ${daysUntil}d`;
    return {
      id: job.id,
      type: "closing-soon",
      jobTitle: job.title,
      company: job.company,
      reason,
      daysUntil,
      urgency,
      ctaLabel: "Tailor resume",
      ctaHref: `/resume?jobId=${encodeURIComponent(job.id)}`,
    };
  }
  // No explicit deadline: rolling-admission heuristic. Bookmarked > 14d ago
  // and never applied to.
  if (job.status !== "bookmarked") return null;
  const created = parseDate(job.created_at);
  if (created === null) return null;
  const ageDays = Math.floor((now - created) / DAY);
  if (ageDays <= 14) return null;
  // Use ageDays in place of daysUntil for the score: older = more urgent,
  // capped same way. We invert so that age 14 -> low, age 28 -> high.
  const urgency = clamp(40 + (ageDays - 14) * 4, 40, 90);
  return {
    id: job.id,
    type: "closing-soon",
    jobTitle: job.title,
    company: job.company,
    reason: `Bookmarked ${ageDays}d ago — apply or drop`,
    urgency,
    ctaLabel: "Tailor resume",
    ctaHref: `/resume?jobId=${encodeURIComponent(job.id)}`,
  };
}

function buildFollowUp(job: Job, now: number): RadarAction | null {
  if (job.status !== "applied") return null;
  const applied = parseDate(job.applied_at);
  if (applied === null) return null;
  const daysSince = Math.floor((now - applied) / DAY);
  if (daysSince <= 10) return null;
  const urgency = clamp(40 + Math.min(60, daysSince * 3), 0, 100);
  return {
    id: job.id,
    type: "follow-up",
    jobTitle: job.title,
    company: job.company,
    reason: `${daysSince}d since applied — no reply`,
    daysSince,
    urgency,
    ctaLabel: "Draft follow-up",
    ctaHref: `/outreach?jobId=${encodeURIComponent(job.id)}`,
  };
}

function buildPrepInterview(job: Job, now: number): RadarAction | null {
  if (job.status !== "interviewing") return null;
  const when = extractInterviewWhen(job, now);
  // Even with no scheduled date, surface a low-urgency "prep" nudge so the
  // user gets a path into the prep tool from the dashboard.
  if (when === null) {
    return {
      id: job.id,
      type: "prep-interview",
      jobTitle: job.title,
      company: job.company,
      reason: "Interview pending — prep ahead",
      urgency: 55,
      ctaLabel: "Open prep",
      ctaHref: `/interviews?jobId=${encodeURIComponent(job.id)}`,
    };
  }
  if (when.ts === null) {
    // Freeform string — show it but no date-based urgency.
    return {
      id: job.id,
      type: "prep-interview",
      jobTitle: job.title,
      company: job.company,
      reason: `Prep — ${when.display}`,
      scheduledFor: when.display,
      urgency: 60,
      ctaLabel: "Open prep",
      ctaHref: `/interviews?jobId=${encodeURIComponent(job.id)}`,
    };
  }
  const daysUntil = daysBetween(when.ts, now);
  // Don't surface interviews more than 14 days out (out of action range).
  if (daysUntil > 14) return null;
  const urgencyRaw = 60 + Math.min(40, (4 - daysUntil) * 10);
  const urgency = clamp(urgencyRaw, 60, 100);
  const reason =
    daysUntil < 0
      ? `Interview was ${Math.abs(daysUntil)}d ago`
      : daysUntil === 0
        ? "Interview today"
        : daysUntil === 1
          ? "Interview tomorrow"
          : `Interview in ${daysUntil}d`;
  return {
    id: job.id,
    type: "prep-interview",
    jobTitle: job.title,
    company: job.company,
    reason,
    scheduledFor: when.display,
    urgency,
    ctaLabel: "Open prep",
    ctaHref: `/interviews?jobId=${encodeURIComponent(job.id)}`,
  };
}

/**
 * Compute the radar snapshot. Pure: only depends on the inputs.
 */
export function computeActionRadar(
  jobs: Job[],
  now: number = Date.now(),
): RadarSnapshot {
  const candidates: RadarAction[] = [];
  for (const job of jobs) {
    if (job.archived) continue;
    if (job.closed_at) continue;
    // Each job contributes at most one action — the most relevant for its
    // current state. Order matters: a job in "interviewing" is past
    // "applied" and shouldn't double-count as follow-up.
    const prep = buildPrepInterview(job, now);
    if (prep) {
      candidates.push(prep);
      continue;
    }
    const follow = buildFollowUp(job, now);
    if (follow) {
      candidates.push(follow);
      continue;
    }
    const closing = buildClosingSoon(job, now);
    if (closing) {
      candidates.push(closing);
      continue;
    }
  }

  candidates.sort((a, b) => {
    if (b.urgency !== a.urgency) return b.urgency - a.urgency;
    return TIE_BREAK[a.type] - TIE_BREAK[b.type];
  });

  return {
    actions: candidates.slice(0, 3),
    totalAvailable: candidates.length,
    generatedAt: now,
  };
}
