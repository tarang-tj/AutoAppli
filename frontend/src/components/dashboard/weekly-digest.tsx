"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Rocket,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { Job } from "@/types";

/**
 * WeeklyDigest — at-a-glance KPIs computed entirely from the jobs array.
 *
 * Four cards:
 *   1. This week — applied jobs where applied_at falls in the last 7 days,
 *      with Δ vs the 7 days before that.
 *   2. Stale — applications in "applied" or "interviewing" whose
 *      updated_at is > 14 days ago. Nudges users to send a follow-up.
 *   3. Upcoming — jobs with next_step_date in the next 7 days. The card
 *      turns amber if any land today or tomorrow.
 *   4. Response rate — % of applied jobs that advanced past "applied"
 *      (interviewing + offer) minus rejected noise.
 *
 * The component is pure: no network calls, no side effects. The parent
 * dashboard owns job loading via the useJobs hook; we just project a
 * read-only summary.
 */

type Props = {
  jobs: Job[];
};

const DAY = 86_400_000;

function parseDate(x?: string | null): number | null {
  if (!x) return null;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

function deltaIcon(delta: number): { Icon: React.ElementType; tone: string } {
  if (delta > 0) return { Icon: TrendingUp, tone: "text-emerald-400" };
  if (delta < 0) return { Icon: TrendingDown, tone: "text-rose-400" };
  return { Icon: Minus, tone: "text-zinc-500" };
}

export function WeeklyDigest({ jobs }: Props) {
  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * DAY;
    const twoWeeksAgo = now - 14 * DAY;

    let thisWeek = 0;
    let prevWeek = 0;
    const stale: Job[] = [];
    const upcoming: Job[] = [];
    let appliedOrLater = 0;
    let interviewingOrBetter = 0;

    for (const j of jobs) {
      const applied = parseDate(j.applied_at);
      const updated = parseDate(j.updated_at);
      const next = parseDate(j.next_step_date);

      if (applied !== null) {
        if (applied >= weekAgo) thisWeek++;
        else if (applied >= twoWeeksAgo) prevWeek++;
      }

      const isActive = j.status === "applied" || j.status === "interviewing";
      if (isActive && updated !== null && updated < twoWeeksAgo) {
        stale.push(j);
      }

      if (next !== null && next >= now - DAY && next <= now + 7 * DAY) {
        upcoming.push(j);
      }

      if (j.status !== "bookmarked") appliedOrLater++;
      if (j.status === "interviewing" || j.status === "offer") {
        interviewingOrBetter++;
      }
    }

    const responseRate =
      appliedOrLater > 0
        ? Math.round((interviewingOrBetter / appliedOrLater) * 100)
        : null;

    // Sort upcoming earliest first so the "soonest" is visible.
    upcoming.sort(
      (a, b) => (parseDate(a.next_step_date) ?? 0) - (parseDate(b.next_step_date) ?? 0)
    );

    const hasUrgent = upcoming.some((j) => {
      const t = parseDate(j.next_step_date);
      return t !== null && t <= now + 2 * DAY;
    });

    return {
      thisWeek,
      weekDelta: thisWeek - prevWeek,
      stale,
      upcoming,
      hasUrgent,
      responseRate,
      appliedOrLater,
    };
  }, [jobs]);

  // Hide until there's at least one job — keeps the empty dashboard clean.
  if (jobs.length === 0) return null;

  const { Icon: DeltaIcon, tone: deltaTone } = deltaIcon(stats.weekDelta);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">
          This week at a glance
        </h2>
        <span className="text-[11px] text-zinc-500">
          Updated {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* This week applied */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Rocket className="h-3.5 w-3.5" />
              Applied this week
            </div>
            {stats.weekDelta !== 0 && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] ${deltaTone}`}>
                <DeltaIcon className="h-3 w-3" />
                {Math.abs(stats.weekDelta)}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {stats.weekDelta > 0
              ? `+${stats.weekDelta} vs. last week`
              : stats.weekDelta < 0
              ? `${stats.weekDelta} vs. last week`
              : "Same as last week"}
          </div>
        </div>

        {/* Stale apps */}
        <div
          className={`rounded-xl border p-4 ${
            stats.stale.length > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-zinc-800 bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Needs follow-up
          </div>
          <div className="text-2xl font-bold text-white">{stats.stale.length}</div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {stats.stale.length === 0
              ? "Everything recent"
              : `Silent 14+ days`}
          </div>
        </div>

        {/* Upcoming */}
        <div
          className={`rounded-xl border p-4 ${
            stats.hasUrgent
              ? "border-blue-500/30 bg-blue-500/5"
              : "border-zinc-800 bg-zinc-900/60"
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
            <CalendarClock className="h-3.5 w-3.5" />
            Next 7 days
          </div>
          <div className="text-2xl font-bold text-white">{stats.upcoming.length}</div>
          <div className="mt-1 text-[11px] text-zinc-500 truncate">
            {stats.upcoming[0]
              ? `${stats.upcoming[0].company} · ${stats.upcoming[0].next_step ?? "Next step"}`
              : "No scheduled steps"}
          </div>
        </div>

        {/* Response rate */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
            <Target className="h-3.5 w-3.5" />
            Response rate
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.responseRate === null ? "—" : `${stats.responseRate}%`}
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {stats.responseRate === null
              ? "Apply to unlock"
              : `${stats.appliedOrLater} application${stats.appliedOrLater === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>

      {/* Inline nudge when stale apps exist — one-click shortcut to
          the outreach page where the user can draft a follow-up. */}
      {stats.stale.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
          <span className="text-amber-200/90">
            {stats.stale.length} application{stats.stale.length === 1 ? "" : "s"} silent for 14+ days. A short nudge often works.
          </span>
          <Link
            href="/outreach"
            className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 font-medium text-amber-100 hover:bg-amber-500/20 transition-colors"
          >
            Draft follow-up →
          </Link>
        </div>
      )}
    </div>
  );
}
