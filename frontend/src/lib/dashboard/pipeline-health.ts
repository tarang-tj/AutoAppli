/**
 * Pipeline Health Score — pure logic for the "job-search credit score" widget.
 *
 * Computes three independent signals (each 0-33) and a combined 0-100 total
 * from the user's kanban activity. No backend; everything runs against the
 * already-loaded `jobs` array.
 *
 * Signals
 *   1. Velocity     — applications-per-week pace over the last 28 days.
 *                     5+ apps/week saturates at 33; linear in between.
 *   2. Conversion   — % of ever-applied jobs that reached "interviewing" or
 *                     beyond ("offer"). 15% saturates at 33. Returns null
 *                     when fewer than 5 jobs have been applied to (sample
 *                     too small to be meaningful).
 *   3. Follow-up    — inverse-scored % of stale applied jobs (status still
 *                     "applied", applied > 10 days ago) that lack any
 *                     follow-up signal. 0% stale-without-followup → 33;
 *                     100% → 0. Returns null when the user has 0 applied
 *                     jobs at all.
 *
 * Insufficient-data scaling
 *   If a signal returns null, it is excluded from the total. Total is the
 *   sum of remaining non-null signals scaled up to a 0-100 range:
 *     scale = 100 / (33 * non_null_count)
 *     total = round(sum_of_signals * scale)
 *   Example: only velocity available (33) + 2 nulls → 33 * (100/33) = 100.
 *   Example: velocity 20 + follow-up 16, conversion null → 36 * (100/66) ≈ 55.
 *   When all three signals are null (empty/cold board), total is 0.
 *
 * Pure: no Date.now()/Math.random() inside. Caller passes `now`; default
 * resolves Date.now() at call time, not module load.
 *
 * Heuristic — "has follow-up" for a stale applied job
 *   The Job type has no `outreach_messages` or `interview_notes` array
 *   attached. We treat a stale applied job as "has follow-up" when ANY
 *   of these are true:
 *     - `next_step` is set (user logged what's next)
 *     - `next_step_date` parses to a real date (scheduled action)
 *     - `notes` contains 4+ chars beyond whitespace (manual log)
 *     - `recruiter_email` or `recruiter_name` is present (warm contact)
 *     - `updated_at` is more than 1 day newer than `applied_at` (movement)
 *   Anything else counts as "stale, no follow-up".
 */
import type { Job } from "@/types";

const DAY = 86_400_000;
const VELOCITY_WINDOW_DAYS = 28;
const VELOCITY_TARGET_APPS_PER_WEEK = 5;
const CONVERSION_TARGET_RATE = 0.15;
const CONVERSION_MIN_SAMPLE = 5;
const STALE_AFTER_DAYS = 10;
const SIGNAL_MAX = 33;

export type SignalLabel = "velocity" | "conversion" | "follow-up";
export type HealthCategory = "weak" | "ok" | "strong";

export interface SignalScore {
  /** 0-33 or null when insufficient data. */
  value: number | null;
  label: SignalLabel;
  /** Human-readable, terse — "3.2 apps/week", "12% reach interviews". */
  detail: string;
  /** Optional context — "Target: 5/week", "Strong: 15%+". */
  benchmark?: string;
}

export interface PipelineHealthSnapshot {
  /** 0-100, never null. Capped at 100. */
  total: number;
  category: HealthCategory;
  /** Always 3 entries in fixed order: velocity, conversion, follow-up. */
  signals: SignalScore[];
  /** Single-sentence next-best-action targeting the lowest non-null signal. */
  topAction: string;
  /** Snapshot timestamp; useful for debugging and tests. */
  generatedAt: number;
}

function parseDate(x?: string | null): number | null {
  if (!x) return null;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isAppliedOrBeyond(j: Job): boolean {
  // Any job that ever had applied_at set counts as "applied" for the
  // conversion denominator — including ones now in interviewing/offer/
  // rejected/ghosted. We do NOT use the `status` field alone because a
  // user could move a card backwards.
  return parseDate(j.applied_at) !== null;
}

function reachedInterviewOrBeyond(j: Job): boolean {
  return j.status === "interviewing" || j.status === "offer";
}

function isStaleApplied(j: Job, now: number): boolean {
  if (j.status !== "applied") return false;
  const applied = parseDate(j.applied_at);
  if (applied === null) return false;
  return now - applied > STALE_AFTER_DAYS * DAY;
}

/**
 * Heuristic: does this stale applied job have follow-up activity?
 * Documented in the file header.
 */
function hasFollowUp(j: Job): boolean {
  if (j.next_step && j.next_step.trim().length > 0) return true;
  if (parseDate(j.next_step_date) !== null) return true;
  if (j.notes && j.notes.trim().length >= 4) return true;
  if (j.recruiter_email && j.recruiter_email.trim().length > 0) return true;
  if (j.recruiter_name && j.recruiter_name.trim().length > 0) return true;
  const applied = parseDate(j.applied_at);
  const updated = parseDate(j.updated_at);
  if (applied !== null && updated !== null && updated - applied > DAY) {
    return true;
  }
  return false;
}

function buildVelocity(jobs: Job[], now: number): SignalScore {
  const cutoff = now - VELOCITY_WINDOW_DAYS * DAY;
  let appsInWindow = 0;
  let everApplied = 0;
  for (const j of jobs) {
    if (j.archived) continue;
    const applied = parseDate(j.applied_at);
    if (applied === null) continue;
    everApplied += 1;
    if (applied >= cutoff && applied <= now) appsInWindow += 1;
  }
  // If the user has never applied to anything, velocity is meaningless —
  // surface as "no signal" rather than scoring them a hard 0.
  if (everApplied === 0) {
    return {
      value: null,
      label: "velocity",
      detail: "No applications yet",
      benchmark: "Target: 5/week",
    };
  }
  const perWeek = appsInWindow / (VELOCITY_WINDOW_DAYS / 7);
  const ratio = Math.min(1, perWeek / VELOCITY_TARGET_APPS_PER_WEEK);
  const value = Math.round(ratio * SIGNAL_MAX);
  // Show one decimal when fractional, integer when whole — feels more
  // honest than "3.0 apps/week" when the user did exactly 3.
  const perWeekStr =
    Number.isInteger(perWeek) ? perWeek.toFixed(0) : perWeek.toFixed(1);
  return {
    value,
    label: "velocity",
    detail:
      appsInWindow === 0
        ? "0 apps in the last 28 days"
        : `${perWeekStr} apps/week`,
    benchmark: "Target: 5/week",
  };
}

function buildConversion(jobs: Job[]): SignalScore {
  let appliedCount = 0;
  let convertedCount = 0;
  for (const j of jobs) {
    if (j.archived) continue;
    if (!isAppliedOrBeyond(j)) continue;
    appliedCount += 1;
    if (reachedInterviewOrBeyond(j)) convertedCount += 1;
  }
  if (appliedCount < CONVERSION_MIN_SAMPLE) {
    return {
      value: null,
      label: "conversion",
      detail:
        appliedCount === 0
          ? "No applications yet"
          : `${appliedCount} of 5 apps needed`,
      benchmark: "Strong: 15%+",
    };
  }
  const rate = convertedCount / appliedCount;
  const ratio = Math.min(1, rate / CONVERSION_TARGET_RATE);
  const value = Math.round(ratio * SIGNAL_MAX);
  const pct = Math.round(rate * 100);
  return {
    value,
    label: "conversion",
    detail: `${pct}% reach interviews`,
    benchmark: "Strong: 15%+",
  };
}

function buildFollowUp(jobs: Job[], now: number): SignalScore {
  let appliedCount = 0;
  let staleCount = 0;
  let staleWithoutFollowUp = 0;
  for (const j of jobs) {
    if (j.archived) continue;
    if (!isAppliedOrBeyond(j)) continue;
    appliedCount += 1;
    if (!isStaleApplied(j, now)) continue;
    staleCount += 1;
    if (!hasFollowUp(j)) staleWithoutFollowUp += 1;
  }
  if (appliedCount === 0) {
    return {
      value: null,
      label: "follow-up",
      detail: "No applications yet",
      benchmark: "Lower is better",
    };
  }
  if (staleCount === 0) {
    return {
      value: SIGNAL_MAX,
      label: "follow-up",
      detail: "No stale apps — clean board",
      benchmark: "Lower is better",
    };
  }
  const rate = staleWithoutFollowUp / staleCount;
  const value = Math.round((1 - rate) * SIGNAL_MAX);
  const pct = Math.round(rate * 100);
  return {
    value,
    label: "follow-up",
    detail:
      staleWithoutFollowUp === 0
        ? `0 of ${staleCount} stale apps need follow-up`
        : `${pct}% of stale apps lack follow-up`,
    benchmark: "Lower is better",
  };
}

function computeTotal(signals: SignalScore[]): number {
  const nonNull = signals.filter((s): s is SignalScore & { value: number } =>
    s.value !== null,
  );
  if (nonNull.length === 0) return 0;
  const sum = nonNull.reduce((acc, s) => acc + s.value, 0);
  const scale = 100 / (SIGNAL_MAX * nonNull.length);
  return clamp(Math.round(sum * scale), 0, 100);
}

function categoryOf(total: number): HealthCategory {
  if (total >= 70) return "strong";
  if (total >= 40) return "ok";
  return "weak";
}

function buildTopAction(
  signals: SignalScore[],
  jobs: Job[],
  now: number,
): string {
  // Lowest non-null signal wins. If all null, generic prompt.
  const nonNull = signals.filter((s) => s.value !== null);
  if (nonNull.length === 0) {
    return "Save your first roles. The pipeline starts the day you do.";
  }
  // Tie-break: when two signals share the lowest score, prefer the one
  // with the most concrete next-step suggestion. follow-up > velocity >
  // conversion (conversion's advice is the most generic, follow-up's is
  // the most specific).
  const TIE_RANK: Record<SignalLabel, number> = {
    "follow-up": 0,
    velocity: 1,
    conversion: 2,
  };
  let weakest = nonNull[0];
  for (const s of nonNull) {
    const sv = s.value ?? 0;
    const wv = weakest.value ?? 0;
    if (sv < wv) {
      weakest = s;
    } else if (sv === wv && TIE_RANK[s.label] < TIE_RANK[weakest.label]) {
      weakest = s;
    }
  }
  if (weakest.label === "velocity") {
    return "Save 3 more roles this week. The pipeline runs cold without fresh apps.";
  }
  if (weakest.label === "conversion") {
    return "Review the apps you've sent. Are you tailoring the resume, or spraying?";
  }
  // follow-up
  let count = 0;
  for (const j of jobs) {
    if (j.archived) continue;
    if (!isStaleApplied(j, now)) continue;
    if (!hasFollowUp(j)) count += 1;
  }
  if (count === 0) {
    return "Stay on top of stale apps. A check-in beats silence.";
  }
  return `${count} stale app${count === 1 ? "" : "s"} without a follow-up. Pick the top 2 and draft a check-in.`;
}

/**
 * Compute the pipeline-health snapshot for a user's job list.
 * Pure: only depends on inputs (`jobs`, `now`). Safe to memoize.
 */
export function computePipelineHealth(
  jobs: Job[],
  now: number = Date.now(),
): PipelineHealthSnapshot {
  const velocity = buildVelocity(jobs, now);
  const conversion = buildConversion(jobs);
  const followUp = buildFollowUp(jobs, now);
  const signals: SignalScore[] = [velocity, conversion, followUp];
  const total = computeTotal(signals);
  return {
    total,
    category: categoryOf(total),
    signals,
    topAction: buildTopAction(signals, jobs, now),
    generatedAt: now,
  };
}
