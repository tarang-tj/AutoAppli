"use client";

/**
 * FitBadge — a compact score chip that reveals the full breakdown on hover.
 *
 * Renders a color-coded pill (green/blue/amber/red/gray) with the 0-100
 * score, plus a popover that lists every signal's contribution.
 *
 * Usage:
 *   <FitBadge match={match} />
 *
 * Color thresholds deliberately match the `buildHeadline` bands in score.ts
 * so the headline and chip color always agree.
 */

import * as React from "react";
import type { MatchResult } from "@/lib/match";

function tierForScore(score: number): { label: string; className: string } {
  if (score >= 85) return { label: "Excellent", className: "bg-emerald-100 text-emerald-900 border-emerald-300" };
  if (score >= 70) return { label: "Strong", className: "bg-sky-100 text-sky-900 border-sky-300" };
  if (score >= 55) return { label: "Solid", className: "bg-blue-50 text-blue-900 border-blue-200" };
  if (score >= 40) return { label: "Possible", className: "bg-amber-100 text-amber-900 border-amber-300" };
  return { label: "Weak", className: "bg-zinc-100 text-zinc-700 border-zinc-300" };
}

export interface FitBadgeProps {
  match: MatchResult;
  /** When true, renders a larger badge suitable for the top of a job detail page. */
  large?: boolean;
  className?: string;
}

export function FitBadge({ match, large = false, className = "" }: FitBadgeProps) {
  const tier = tierForScore(match.score);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 ${large ? "py-1 text-sm" : "py-0.5 text-xs"} font-medium ${tier.className} hover:shadow-sm transition-shadow`}
        aria-label={`Match score ${match.score} — ${tier.label}`}
        aria-expanded={open}
      >
        <span className="font-semibold">{match.score.toFixed(0)}</span>
        <span className="opacity-70">·</span>
        <span>{tier.label} fit</span>
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-50 top-full mt-2 w-80 rounded-lg border border-zinc-200 bg-white p-3 text-xs shadow-lg left-0"
        >
          <div className="font-medium text-zinc-900 mb-1">{match.headline}</div>
          <ul className="space-y-1 mt-2">
            {match.breakdown.map((row) => (
              <li key={row.signal} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="capitalize text-zinc-700">{row.signal}</div>
                  <div className="text-zinc-500 truncate">{row.note}</div>
                </div>
                <div className="text-zinc-900 tabular-nums flex-shrink-0">
                  +{row.points.toFixed(1)}
                  <span className="ml-1 text-zinc-400">/ {(row.weight * 100).toFixed(0)}</span>
                </div>
              </li>
            ))}
          </ul>
          {match.missingSkills.length > 0 && (
            <div className="mt-2 border-t border-zinc-100 pt-2">
              <div className="text-zinc-500 mb-1">Gaps:</div>
              <div className="flex flex-wrap gap-1">
                {match.missingSkills.slice(0, 8).map((s) => (
                  <span key={s} className="inline-flex items-center rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-700">{s}</span>
                ))}
                {match.missingSkills.length > 8 && (
                  <span className="text-zinc-500">+{match.missingSkills.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

export default FitBadge;
