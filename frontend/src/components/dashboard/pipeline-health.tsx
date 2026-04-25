"use client";

/**
 * PipelineHealth — visual dashboard widget that surfaces a 0-100
 * "job-search credit score" plus three sub-signals (velocity, conversion,
 * follow-up). All scoring is delegated to `lib/dashboard/pipeline-health.ts`
 * which is pure and unit-tested.
 *
 * Mirrors the ActionRadar pattern: useSyncExternalStore for `now` so the
 * render stays pure, useMemo around the snapshot, calm empty state.
 */
import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { useJobs } from "@/hooks/use-jobs";
import { useStableNow } from "@/hooks/use-stable-now";
import {
  computePipelineHealth,
  type HealthCategory,
  type SignalLabel,
  type SignalScore,
} from "@/lib/dashboard/pipeline-health";

const CATEGORY_TONE: Record<HealthCategory, string> = {
  weak: "text-rose-300",
  ok: "text-amber-200",
  strong: "text-emerald-300",
};

const CATEGORY_BADGE: Record<HealthCategory, string> = {
  weak: "border-rose-500/30 bg-rose-500/15 text-rose-200",
  ok: "border-amber-500/30 bg-amber-500/15 text-amber-200",
  strong: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200",
};

const CATEGORY_BAR: Record<HealthCategory, string> = {
  weak: "bg-rose-400",
  ok: "bg-amber-400",
  strong: "bg-emerald-400",
};

const SIGNAL_TITLE: Record<SignalLabel, string> = {
  velocity: "Velocity",
  conversion: "Conversion",
  "follow-up": "Follow-up",
};

const SIGNAL_HREF: Record<SignalLabel, string> = {
  velocity: "/jobs",
  conversion: "/resume",
  "follow-up": "/outreach",
};

function categoryFromValue(value: number, max: number): HealthCategory {
  // Mirror the same thresholds the total uses, scaled to a 0-33 sub-score.
  const pct = (value / max) * 100;
  if (pct >= 70) return "strong";
  if (pct >= 40) return "ok";
  return "weak";
}

function SignalBar({ signal }: { signal: SignalScore }) {
  const max = 33;
  const isNull = signal.value === null;
  const value = signal.value ?? 0;
  const pct = isNull ? 0 : Math.min(100, (value / max) * 100);
  const tone = isNull ? "weak" : categoryFromValue(value, max);
  const valueText = isNull ? "—" : `${value}/${max}`;
  // aria-valuetext gives screen readers the full sentence ("3.2 apps per
  // week") instead of the bare number. Keep it concise.
  const ariaValueText = isNull
    ? `${SIGNAL_TITLE[signal.label]}: insufficient data`
    : `${SIGNAL_TITLE[signal.label]}: ${signal.detail}`;
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-zinc-100">
            {SIGNAL_TITLE[signal.label]}
            <span className="ml-2 text-[11px] text-zinc-400 font-normal">
              {signal.detail}
            </span>
          </p>
          {signal.benchmark ? (
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {signal.benchmark}
            </p>
          ) : null}
        </div>
        <span
          className={`text-[11px] tabular-nums font-medium ${isNull ? "text-zinc-500" : CATEGORY_TONE[tone]}`}
        >
          {valueText}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={ariaValueText}
        className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"
      >
        <div
          className={`h-full rounded-full ${isNull ? "bg-zinc-700" : CATEGORY_BAR[tone]} [transition:width_300ms]`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

export function PipelineHealth() {
  const { jobs, isLoading } = useJobs();
  const now = useStableNow();
  const snapshot = useMemo(
    () => computePipelineHealth(jobs, now),
    [jobs, now],
  );

  // Hide entirely on first paint while jobs are still loading.
  if (isLoading && jobs.length === 0) return null;

  // Empty state — no jobs at all. Calm placeholder, no score.
  if (jobs.length === 0) {
    return (
      <section
        role="region"
        aria-labelledby="pipeline-health-heading"
        className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60"
      >
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800/70">
          <h2
            id="pipeline-health-heading"
            className="flex items-center gap-2 text-sm font-semibold text-zinc-100"
          >
            <Gauge className="h-4 w-4 text-blue-300" aria-hidden="true" />
            Pipeline health
          </h2>
        </header>
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-zinc-300">
            Save your first job to start tracking pipeline health.
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Score appears once the board has activity.
          </p>
        </div>
      </section>
    );
  }

  const { total, category, signals, topAction } = snapshot;
  const lowestNonNull = signals
    .filter((s) => s.value !== null)
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))[0];
  const actionHref = lowestNonNull ? SIGNAL_HREF[lowestNonNull.label] : "/jobs";

  return (
    <section
      role="region"
      aria-labelledby="pipeline-health-heading"
      className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60"
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800/70">
        <h2
          id="pipeline-health-heading"
          className="flex items-center gap-2 text-sm font-semibold text-zinc-100"
        >
          <Gauge className="h-4 w-4 text-blue-300" aria-hidden="true" />
          Pipeline health
        </h2>
        <span className="text-[11px] text-zinc-500 tabular-nums">
          Updated just now
        </span>
      </header>

      <div className="flex items-baseline gap-3 px-4 pt-4 pb-2">
        <span
          className={`text-4xl font-bold tabular-nums tracking-tight ${CATEGORY_TONE[category]}`}
          aria-label={`Pipeline health score ${total} out of 100`}
        >
          {total}
        </span>
        <span className="text-sm text-zinc-500">/ 100</span>
        <span
          className={`ml-auto inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-wide ${CATEGORY_BADGE[category]}`}
          aria-hidden="true"
        >
          {category}
        </span>
      </div>

      <ul className="divide-y divide-zinc-800/70">
        {signals.map((s) => (
          <SignalBar key={s.label} signal={s} />
        ))}
      </ul>

      <div className="border-t border-zinc-800/70 p-3">
        <Link
          href={actionHref}
          aria-label={`Top action — ${topAction}`}
          className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-[12px] text-blue-100 no-underline hover:bg-blue-500/15 [transition:background-color_150ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        >
          <span className="flex-1 leading-snug">{topAction}</span>
          <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-300" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
