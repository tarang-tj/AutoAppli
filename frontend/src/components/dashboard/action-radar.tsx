"use client";

/**
 * ActionRadar — surfaces the 3 most-actionable next steps from the user's
 * jobs board. Drops in between WeeklyDigest and InsightsCards on the
 * dashboard. All scoring is delegated to `lib/dashboard/action-radar.ts`
 * which is pure and unit-tested.
 */
import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarCheck, Clock, Mail, Radar } from "lucide-react";
import { useJobs } from "@/hooks/use-jobs";
import {
  computeActionRadar,
  type ActionType,
  type RadarAction,
} from "@/lib/dashboard/action-radar";

// Read "now" via useSyncExternalStore so the renderer stays pure (Date.now
// lives in the snapshot getter, mirrors the pattern in WeeklyDigest).
const subscribeNoop = () => () => {};
const getNowSnapshot = () => Date.now();
const getNowServerSnapshot = () => 0;

const TYPE_ICON: Record<ActionType, typeof Clock> = {
  "closing-soon": Clock,
  "follow-up": Mail,
  "prep-interview": CalendarCheck,
};

const TYPE_TONE: Record<ActionType, string> = {
  "closing-soon": "text-rose-300",
  "follow-up": "text-amber-300",
  "prep-interview": "text-blue-300",
};

function urgencyClasses(urgency: number): string {
  if (urgency >= 80) {
    return "bg-rose-500/15 text-rose-200 border-rose-500/30";
  }
  if (urgency >= 50) {
    return "bg-amber-500/15 text-amber-200 border-amber-500/30";
  }
  return "bg-blue-500/15 text-blue-200 border-blue-500/30";
}

function urgencyLabel(urgency: number): string {
  if (urgency >= 80) return "High";
  if (urgency >= 50) return "Medium";
  return "Low";
}

function ActionRow({ action }: { action: RadarAction }) {
  const Icon = TYPE_ICON[action.type];
  const tone = TYPE_TONE[action.type];
  const urgency = Math.round(action.urgency);
  return (
    <li className="flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/40 [transition:background-color_150ms]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80">
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {action.jobTitle}
          <span className="text-zinc-400"> · {action.company}</span>
        </p>
        <p className="truncate text-[11px] text-zinc-400">{action.reason}</p>
      </div>
      <span
        className={`hidden sm:inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-wide tabular-nums ${urgencyClasses(action.urgency)}`}
        aria-label={`Urgency ${urgencyLabel(urgency)}, score ${urgency}`}
      >
        {urgencyLabel(urgency)}
      </span>
      <Link
        href={action.ctaHref}
        className="shrink-0 rounded-md border border-blue-500/40 bg-blue-600/90 px-2.5 py-1 text-[11px] font-medium text-white no-underline hover:bg-blue-600 [transition:background-color_150ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        aria-label={`${action.ctaLabel} for ${action.jobTitle} at ${action.company}`}
      >
        {action.ctaLabel}
      </Link>
    </li>
  );
}

export function ActionRadar() {
  const { jobs, isLoading } = useJobs();
  const now = useSyncExternalStore(
    subscribeNoop,
    getNowSnapshot,
    getNowServerSnapshot,
  );
  const snapshot = useMemo(() => computeActionRadar(jobs, now), [jobs, now]);

  // Hide entirely on the empty/loading dashboard — no signal to give yet.
  if (isLoading && jobs.length === 0) return null;
  if (jobs.length === 0) return null;

  const { actions, totalAvailable } = snapshot;
  const more = totalAvailable - actions.length;

  return (
    <section
      role="region"
      aria-labelledby="action-radar-heading"
      className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60"
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-800/70">
        <h2
          id="action-radar-heading"
          className="flex items-center gap-2 text-sm font-semibold text-zinc-100"
        >
          <Radar className="h-4 w-4 text-blue-300" aria-hidden="true" />
          Action radar
        </h2>
        {totalAvailable > 0 ? (
          <span className="text-[11px] text-zinc-500 tabular-nums">
            Top {actions.length} of {totalAvailable}
          </span>
        ) : null}
      </header>

      {actions.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-zinc-300">Nothing urgent.</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Use this calm to add fresh roles to your board.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {actions.map((a) => (
            <ActionRow key={a.id} action={a} />
          ))}
        </ul>
      )}

      {more > 0 ? (
        <div className="border-t border-zinc-800/70 px-4 py-2 text-right">
          <span className="text-[11px] text-zinc-500">
            +{more} more action{more === 1 ? "" : "s"} on your board
          </span>
        </div>
      ) : null}
    </section>
  );
}
