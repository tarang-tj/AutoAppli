"use client";

/**
 * GoalTracker — weekly application target widget.
 *
 * Visual language: retro arcade scoreboard / CRT phosphor.
 * Functionally identical to v1 (week count, streak, projection,
 * edit-via-dialog backed by `lib/goals/storage.ts`) — the redesign is
 * presentational. The only "loud" element on the dashboard, by design.
 *
 * Typography: VT323 for digits, Share Tech Mono for labels. Both loaded
 * via `next/font/google` at module top-level (Next 16 requires this) and
 * scoped to this widget via the wrapping section's className so they
 * don't leak into the rest of the app.
 *
 * Accessibility: preserves role="region", aria-labelledby, role="progressbar"
 * with aria-valuenow/min/max, and the dialog labels. Glow + scanlines are
 * decorative only and respect prefers-reduced-motion (the only animation
 * is the power-dot pulse, gated by `motion-safe:`).
 *
 * Test-stable hooks (referenced by goal-tracker.test.tsx):
 *   data-testid="goal-tracker", data-testid="goal-tracker-edit",
 *   aria-label `"{n} of {t} applications this week"`,
 *   text `"/ {t} this week"`, `"{n}-week streak"`, `"Start your streak"`,
 *   projection text — all preserved.
 *
 * File hygiene: subcomponents live in `./_goal-tracker/` to keep this
 * file under the 200-line target.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { VT323, Share_Tech_Mono } from "next/font/google";
import {
  getGoalConfigSnapshot,
  getGoalConfigServerSnapshot,
  subscribeGoalConfig,
  setGoalConfig,
} from "@/lib/goals/storage";
import type { Job } from "@/types";
import {
  PHOSPHOR,
  SCANLINES,
  VIGNETTE,
  LABEL_GLOW,
  TOP_EDGE,
  POWER_DOT,
  SEGMENTS,
} from "./_goal-tracker/arcade-styles";
import { ScoreDisplay } from "./_goal-tracker/score-display";
import { EditGoalDialog } from "./_goal-tracker/edit-goal-dialog";

// ── Fonts (must be at module top-level for next/font) ────────────────────

const arcadeDigits = VT323({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-arcade-digits",
});

const arcadeLabel = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-arcade-label",
});

// ── Date helpers ──────────────────────────────────────────────────────────

/** Returns the Monday of the ISO week containing the given date (local time). */
function weekMonday(d: Date): Date {
  const day = d.getDay();
  const offset = day === 0 ? 6 : day - 1;
  const m = new Date(d);
  m.setDate(m.getDate() - offset);
  m.setHours(0, 0, 0, 0);
  return m;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function countJobsInWeek(jobs: Job[], monday: Date): number {
  const end = new Date(monday);
  end.setDate(end.getDate() + 7);
  return jobs.filter((j) => {
    const ts = new Date(j.created_at).getTime();
    return ts >= monday.getTime() && ts < end.getTime();
  }).length;
}

function trailingAverage(jobs: Job[], currentMonday: Date): number {
  if (jobs.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < 4; i++) {
    const m = new Date(currentMonday);
    m.setDate(m.getDate() - i * 7);
    total += countJobsInWeek(jobs, m);
  }
  return total / 4;
}

function computeStreak(
  jobs: Job[],
  currentMonday: Date,
  target: number,
  startDate: Date,
): number {
  let streak = 0;
  const week = new Date(currentMonday);

  if (countJobsInWeek(jobs, week) >= target) {
    streak++;
    week.setDate(week.getDate() - 7);
  } else {
    return 0;
  }

  while (week >= startDate) {
    if (countJobsInWeek(jobs, week) >= target) {
      streak++;
      week.setDate(week.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function computeProjection(
  jobs: Job[],
  currentMonday: Date,
  milestoneTotal: number,
): string {
  const pace = trailingAverage(jobs, currentMonday);
  if (pace <= 0) return "set a goal to see projection";

  const remaining = milestoneTotal - jobs.length;
  if (remaining <= 0) return `${milestoneTotal}-app milestone reached`;

  const weeksNeeded = Math.ceil(remaining / pace);
  const target = new Date(currentMonday);
  target.setDate(target.getDate() + weeksNeeded * 7);
  return `On pace to hit ${milestoneTotal} apps by ${formatDate(target)}`;
}

// ── Component ─────────────────────────────────────────────────────────────

interface GoalTrackerProps {
  jobs: Job[];
}

export function GoalTracker({ jobs }: GoalTrackerProps) {
  const config = useSyncExternalStore(
    subscribeGoalConfig,
    getGoalConfigSnapshot,
    getGoalConfigServerSnapshot,
  );

  const [editOpen, setEditOpen] = useState(false);
  const [draftTarget, setDraftTarget] = useState<string>("");

  const { weekCount, streak, projection, progressPct, segmentsLit } = useMemo(() => {
    const now = new Date();
    const currentMonday = weekMonday(now);
    const startDate = parseLocalDate(config.start_date);
    const target = config.weekly_target;

    const weekCount = countJobsInWeek(jobs, currentMonday);
    const streak = computeStreak(jobs, currentMonday, target, startDate);
    const projection = computeProjection(jobs, currentMonday, target * 10);
    const ratio = weekCount / Math.max(target, 1);
    const progressPct = Math.min(100, Math.round(ratio * 100));
    const segmentsLit = Math.min(SEGMENTS, Math.round(ratio * SEGMENTS));

    return { weekCount, streak, projection, progressPct, segmentsLit };
  }, [jobs, config]);

  function handleEditOpen() {
    setDraftTarget(String(config.weekly_target));
    setEditOpen(true);
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = parseInt(draftTarget, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setGoalConfig({ weekly_target: parsed });
    }
    setEditOpen(false);
  }

  return (
    <section
      role="region"
      aria-labelledby="goal-tracker-heading"
      className={`mb-6 ${arcadeDigits.variable} ${arcadeLabel.variable}`}
      data-testid="goal-tracker"
    >
      <div
        className="relative overflow-hidden rounded-xl border border-emerald-500/25 bg-zinc-950"
        style={VIGNETTE}
      >
        {/* Decorative scanline overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 mix-blend-overlay"
          style={SCANLINES}
        />
        {/* Top edge phosphor glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px"
          style={TOP_EDGE}
        />

        {/* ── Marquee header ───────────────────────────────────────────── */}
        <header className="relative z-20 flex items-center justify-between gap-2 border-b border-emerald-500/20 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 rounded-full motion-safe:animate-pulse"
              style={POWER_DOT}
            />
            <h2
              id="goal-tracker-heading"
              className="truncate text-[11px] font-normal uppercase tracking-[0.28em] font-[family-name:var(--font-arcade-label)]"
              style={LABEL_GLOW}
            >
              Weekly Scoreboard
            </h2>
          </div>
          <EditGoalDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            draftTarget={draftTarget}
            onDraftChange={setDraftTarget}
            onTriggerClick={handleEditOpen}
            onSubmit={handleSave}
          />
        </header>

        {/* ── Main display ────────────────────────────────────────────── */}
        <div className="relative z-20 space-y-4 px-4 pb-4 pt-5">
          <ScoreDisplay
            weekCount={weekCount}
            target={config.weekly_target}
            progressPct={progressPct}
            segmentsLit={segmentsLit}
          />

          {/* Streak badge — framed like a high-score plate */}
          <div
            className="flex items-center justify-between gap-3 rounded-[3px] border px-3 py-2"
            style={{
              borderColor:
                streak > 0 ? "rgba(0,255,136,0.45)" : "rgba(0,255,136,0.15)",
              background:
                streak > 0
                  ? "rgba(0,255,136,0.06)"
                  : "rgba(255,255,255,0.015)",
            }}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="text-base"
                style={{
                  filter:
                    streak > 0
                      ? `drop-shadow(0 0 6px ${PHOSPHOR})`
                      : "grayscale(1) opacity(0.5)",
                }}
              >
                {String.fromCodePoint(0x1f525)}
              </span>
              {streak > 0 ? (
                // Single text node so testing-library's regex matcher finds it.
                <p
                  className="truncate text-sm uppercase tracking-[0.28em] tabular-nums font-[family-name:var(--font-arcade-label)]"
                  style={LABEL_GLOW}
                >
                  {`${streak}-week streak`}
                </p>
              ) : (
                <p
                  className="truncate text-[11px] uppercase tracking-[0.28em] font-[family-name:var(--font-arcade-label)]"
                  style={{ color: "rgba(0,255,136,0.5)" }}
                >
                  Start your streak
                </p>
              )}
            </div>
            {streak > 0 ? (
              <span
                className="hidden text-[9px] uppercase tracking-[0.3em] font-[family-name:var(--font-arcade-label)] sm:inline-block"
                style={{ color: "rgba(0,255,136,0.55)" }}
              >
                HI-SCORE
              </span>
            ) : null}
          </div>

          {/* Projection ticker */}
          <div className="flex items-start gap-2 border-t border-emerald-500/15 pt-3">
            <span
              aria-hidden="true"
              className="mt-0.5 text-[10px] font-[family-name:var(--font-arcade-label)]"
              style={{ color: "rgba(0,255,136,0.5)" }}
            >
              &gt;_
            </span>
            <p
              className="text-[11px] leading-snug tracking-wide font-[family-name:var(--font-arcade-label)]"
              style={{ color: "rgba(0,255,136,0.7)" }}
            >
              {projection}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
