"use client";

/**
 * GoalTracker — weekly application target widget.
 *
 * Shows: current week count vs target, week-over-week streak, and a
 * projection to 10x the weekly target. Config (target + start date) lives
 * in localStorage via `lib/goals/storage.ts` — deliberately structured for
 * a clean Supabase migration later (same pattern as Story Library).
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import { Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getGoalConfigSnapshot,
  getGoalConfigServerSnapshot,
  subscribeGoalConfig,
  setGoalConfig,
} from "@/lib/goals/storage";
import type { Job } from "@/types";

// ── Date helpers ──────────────────────────────────────────────────────────

/** Returns the Monday of the ISO week containing the given date (local time). */
function weekMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const offset = day === 0 ? 6 : day - 1;
  const m = new Date(d);
  m.setDate(m.getDate() - offset);
  m.setHours(0, 0, 0, 0);
  return m;
}

/** yyyy-mm-dd string → Date at midnight local time. */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Count jobs created in a given week (Mon 00:00 – Sun 23:59 local time).
 * @param monday  The Monday date of the target week (midnight local).
 */
function countJobsInWeek(jobs: Job[], monday: Date): number {
  const end = new Date(monday);
  end.setDate(end.getDate() + 7); // exclusive
  return jobs.filter((j) => {
    const ts = new Date(j.created_at).getTime();
    return ts >= monday.getTime() && ts < end.getTime();
  }).length;
}

/**
 * 4-week trailing average (includes the current partial week).
 * Returns 0 when there are no jobs or under 1 week of data.
 */
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

/**
 * How many complete calendar weeks separate two Mondays?
 * @param earlier  Earlier Monday date.
 * @param later    Later Monday date (or current Monday).
 */
function weeksBetween(earlier: Date, later: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

/** Walk backward from current week counting consecutive weeks at-or-above target. */
function computeStreak(
  jobs: Job[],
  currentMonday: Date,
  target: number,
  startDate: Date,
): number {
  let streak = 0;
  let week = new Date(currentMonday);

  // Current week counts only if already at or above target.
  const thisWeek = countJobsInWeek(jobs, week);
  if (thisWeek >= target) {
    streak++;
    week.setDate(week.getDate() - 7);
  } else {
    return 0; // current week below target breaks the streak
  }

  // Walk backward until we miss or hit the start date.
  while (week >= startDate) {
    const count = countJobsInWeek(jobs, week);
    if (count >= target) {
      streak++;
      week.setDate(week.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
}

/** Format a Date as "Mon DD, YYYY" e.g. "Jun 14, 2026". */
function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Projection: at current pace, when do total apps reach milestoneTotal? */
function computeProjection(
  jobs: Job[],
  currentMonday: Date,
  milestoneTotal: number,
): string {
  const pace = trailingAverage(jobs, currentMonday);
  if (pace <= 0) return "set a goal to see projection";

  const remaining = milestoneTotal - jobs.length;
  if (remaining <= 0) {
    return `${milestoneTotal}-app milestone reached`;
  }

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

  const { weekCount, streak, projection, progressPct } = useMemo(() => {
    const now = new Date();
    const currentMonday = weekMonday(now);
    const startDate = parseLocalDate(config.start_date);
    const target = config.weekly_target;

    const weekCount = countJobsInWeek(jobs, currentMonday);
    const streak = computeStreak(jobs, currentMonday, target, startDate);
    const milestoneTotal = target * 10;
    const projection = computeProjection(jobs, currentMonday, milestoneTotal);
    const progressPct = Math.min(100, Math.round((weekCount / Math.max(target, 1)) * 100));

    return { weekCount, streak, projection, progressPct };
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
      className="mb-6"
      data-testid="goal-tracker"
    >
      <Card className="bg-zinc-900/60 border-zinc-800 rounded-xl">
        <CardHeader className="border-b border-zinc-800/70 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle
              id="goal-tracker-heading"
              className="flex items-center gap-2 text-sm font-semibold text-zinc-100"
            >
              <Target className="h-4 w-4 text-blue-300" aria-hidden="true" />
              Goal tracker
            </CardTitle>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-zinc-400 hover:text-zinc-100 px-2 h-7"
                    onClick={handleEditOpen}
                    data-testid="goal-tracker-edit"
                  />
                }
              >
                Edit goal
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Edit weekly goal</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="goal-target" className="text-zinc-200">
                      Weekly application target
                    </Label>
                    <Input
                      id="goal-target"
                      type="number"
                      min={1}
                      max={100}
                      value={draftTarget}
                      onChange={(e) => setDraftTarget(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      aria-describedby="goal-target-hint"
                    />
                    <p id="goal-target-hint" className="text-xs text-zinc-400">
                      How many applications do you want to send per week?
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Save
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          {/* Big number: current week count vs target */}
          <div>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span
                className="text-3xl font-bold tabular-nums tracking-tight text-zinc-50"
                aria-label={`${weekCount} of ${config.weekly_target} applications this week`}
              >
                {weekCount}
              </span>
              <span className="text-sm text-zinc-400">
                / {config.weekly_target} this week
              </span>
            </div>
            {/* Progress bar */}
            <div
              role="progressbar"
              aria-valuenow={weekCount}
              aria-valuemin={0}
              aria-valuemax={config.weekly_target}
              aria-label={`Weekly progress: ${weekCount} of ${config.weekly_target}`}
              className="h-2 rounded-full bg-zinc-800 overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-blue-500 [transition:width_300ms]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Streak row */}
          <p className="text-sm text-zinc-300">
            {streak > 0 ? (
              <>
                <span className="font-medium text-zinc-100">{streak}-week streak</span>{" "}
                🔥
              </>
            ) : (
              <span className="text-zinc-400">Start your streak</span>
            )}
          </p>

          {/* Projection row */}
          <p className="text-[12px] text-zinc-400 leading-snug">{projection}</p>
        </CardContent>
      </Card>
    </section>
  );
}
