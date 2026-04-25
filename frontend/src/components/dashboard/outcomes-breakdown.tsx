"use client";

import { useMemo, useState } from "react";
import type { ClosedReason, Job } from "@/types";
import {
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Trophy,
  XCircle,
} from "lucide-react";

/**
 * OutcomesBreakdown — what *actually* happens to your applications?
 *
 * Reads the `closed_reason` + `closed_at` columns written by the close-out
 * picker (see `job-card.tsx` and migration 20260419130000). Everything is
 * derived client-side from the jobs array — no network calls.
 *
 * The widget hides itself when there aren't enough closed jobs to say
 * something useful (< 3). Below that threshold any percentage is just
 * noise, and the empty state would eat screen real estate on a fresh
 * dashboard.
 */

type Props = {
  jobs: Job[];
};

const REASON_ORDER: ClosedReason[] = [
  "offer_accepted",
  "offer_declined",
  "rejected_by_company",
  "no_response",
  "withdrew",
  "role_closed",
];

const REASON_LABELS: Record<ClosedReason, string> = {
  rejected_by_company: "Rejected",
  withdrew: "Withdrew",
  no_response: "Ghosted",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  role_closed: "Role closed",
};

/** Hex colors chosen to match the CLOSED_REASON_STYLES badges on job cards. */
const REASON_COLORS: Record<ClosedReason, string> = {
  offer_accepted: "#34d399", // emerald-400
  offer_declined: "#38bdf8", // sky-400
  rejected_by_company: "#f87171", // red-400
  no_response: "#fbbf24", // amber-400
  withdrew: "#a1a1aa", // zinc-400
  role_closed: "#71717a", // zinc-500
};

const DAY_MS = 86_400_000;

function parseDate(x?: string | null): number | null {
  if (!x) return null;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

interface OutcomeStats {
  totalClosed: number;
  offers: number;
  rejections: number;
  ghosted: number;
  medianDaysToOutcome: number | null;
  byReason: Record<ClosedReason, number>;
  bySource: Array<{
    source: string;
    closed: number;
    offers: number;
    rejections: number;
    offerRate: number;
    rejectionRate: number;
  }>;
}

function computeStats(jobs: Job[]): OutcomeStats {
  const closed = jobs.filter((j) => Boolean(j.closed_reason));
  const byReason: Record<ClosedReason, number> = {
    rejected_by_company: 0,
    withdrew: 0,
    no_response: 0,
    offer_accepted: 0,
    offer_declined: 0,
    role_closed: 0,
  };
  const daysToOutcome: number[] = [];
  const bySourceMap = new Map<
    string,
    { closed: number; offers: number; rejections: number }
  >();

  for (const j of closed) {
    const reason = j.closed_reason as ClosedReason;
    byReason[reason] = (byReason[reason] ?? 0) + 1;

    const applied = parseDate(j.applied_at) ?? parseDate(j.created_at);
    const closedAt = parseDate(j.closed_at);
    if (applied !== null && closedAt !== null && closedAt >= applied) {
      daysToOutcome.push((closedAt - applied) / DAY_MS);
    }

    const src = (j.source && j.source !== "unknown" ? j.source : "Manual") || "Manual";
    const bucket = bySourceMap.get(src) ?? { closed: 0, offers: 0, rejections: 0 };
    bucket.closed += 1;
    if (reason === "offer_accepted" || reason === "offer_declined") {
      bucket.offers += 1;
    }
    if (reason === "rejected_by_company") {
      bucket.rejections += 1;
    }
    bySourceMap.set(src, bucket);
  }

  const offers = byReason.offer_accepted + byReason.offer_declined;
  const rejections = byReason.rejected_by_company;
  const ghosted = byReason.no_response;

  const bySource = Array.from(bySourceMap.entries())
    .map(([source, v]) => ({
      source,
      closed: v.closed,
      offers: v.offers,
      rejections: v.rejections,
      offerRate: v.closed > 0 ? Math.round((v.offers / v.closed) * 100) : 0,
      rejectionRate:
        v.closed > 0 ? Math.round((v.rejections / v.closed) * 100) : 0,
    }))
    .filter((s) => s.closed >= 3)
    .sort((a, b) => b.closed - a.closed);

  return {
    totalClosed: closed.length,
    offers,
    rejections,
    ghosted,
    medianDaysToOutcome: median(daysToOutcome),
    byReason,
    bySource,
  };
}

function KpiTile({
  icon: Icon,
  iconColor,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-2">
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} aria-hidden="true" />
        {label}
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-zinc-500">{hint}</div> : null}
    </div>
  );
}

export function OutcomesBreakdown({ jobs }: Props) {
  const [sourceTableOpen, setSourceTableOpen] = useState(false);
  const stats = useMemo(() => computeStats(jobs), [jobs]);

  // Quiet until there's enough signal to say anything meaningful.
  if (stats.totalClosed < 3) return null;

  const offerPct = Math.round((stats.offers / stats.totalClosed) * 100);
  const rejectionPct = Math.round((stats.rejections / stats.totalClosed) * 100);
  const ghostedPct = Math.round((stats.ghosted / stats.totalClosed) * 100);

  const medianLabel =
    stats.medianDaysToOutcome === null
      ? "\u2014"
      : `${stats.medianDaysToOutcome.toFixed(0)}d`;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">
          Outcomes breakdown
        </h2>
        <span className="text-[11px] text-zinc-500 tabular-nums">
          {stats.totalClosed} closed
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={Trophy}
          iconColor="#34d399"
          label="Offer rate"
          value={`${offerPct}%`}
          hint={`${stats.offers} offer${stats.offers === 1 ? "" : "s"}`}
        />
        <KpiTile
          icon={XCircle}
          iconColor="#f87171"
          label="Rejection rate"
          value={`${rejectionPct}%`}
          hint={`${stats.rejections} rejected`}
        />
        <KpiTile
          icon={Award}
          iconColor="#fbbf24"
          label="Ghost rate"
          value={`${ghostedPct}%`}
          hint={`${stats.ghosted} ghosted`}
        />
        <KpiTile
          icon={Clock}
          iconColor="#60a5fa"
          label="Median days to close"
          value={medianLabel}
          hint={
            stats.medianDaysToOutcome === null
              ? "Add applied date to unlock"
              : "From applied to outcome"
          }
        />
      </div>

      {/* Stacked bar with the 6 reasons. One pass over REASON_ORDER
          preserves a stable visual order regardless of counts. */}
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-400">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          How your applications end
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          {REASON_ORDER.map((reason) => {
            const n = stats.byReason[reason] ?? 0;
            if (n === 0) return null;
            const pct = (n / stats.totalClosed) * 100;
            return (
              <div
                key={reason}
                className="h-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: REASON_COLORS[reason],
                }}
                title={`${REASON_LABELS[reason]}: ${n} (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-zinc-300">
          {REASON_ORDER.map((reason) => {
            const n = stats.byReason[reason] ?? 0;
            if (n === 0) return null;
            const pct = Math.round((n / stats.totalClosed) * 100);
            return (
              <span key={reason} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: REASON_COLORS[reason] }}
                  aria-hidden="true"
                />
                <span className="text-zinc-300">{REASON_LABELS[reason]}</span>
                <span className="text-zinc-500 tabular-nums">
                  {n} &middot; {pct}%
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Per-source breakdown — only meaningful when one source has ≥3
          closed jobs. Collapsed by default so the widget stays compact. */}
      {stats.bySource.length > 0 ? (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/60">
          <button
            type="button"
            onClick={() => setSourceTableOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-xs text-zinc-300 hover:bg-zinc-800/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-xl"
            aria-expanded={sourceTableOpen}
            aria-controls="outcomes-by-source-panel"
          >
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              By source ({stats.bySource.length})
            </span>
            {sourceTableOpen ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            )}
          </button>
          {sourceTableOpen ? (
            <div
              id="outcomes-by-source-panel"
              className="border-t border-zinc-800 px-4 pb-3 pt-2"
            >
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-1.5 font-medium">Source</th>
                    <th className="py-1.5 font-medium text-right">Closed</th>
                    <th className="py-1.5 font-medium text-right">Offer %</th>
                    <th className="py-1.5 font-medium text-right">Reject %</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-200">
                  {stats.bySource.map((s) => (
                    <tr key={s.source} className="border-t border-zinc-800/60">
                      <td className="py-1.5 truncate max-w-[160px]">{s.source}</td>
                      <td className="py-1.5 text-right tabular-nums">
                        {s.closed}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-emerald-300">
                        {s.offerRate}%
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-rose-300">
                        {s.rejectionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
