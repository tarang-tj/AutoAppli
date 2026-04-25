"use client";
/**
 * Small score badge rendered in the top-right of a DiscoverCard.
 *
 * Colour rings:
 *   80–100  emerald (strong match)
 *   60–79   amber   (decent match)
 *   0–59    zinc    (weak match)
 *   no score → hidden (never show "?")
 *
 * Non-blocking: parent renders cards immediately; badge populates once the
 * /match/scores response resolves.
 */
import { cn } from "@/lib/utils";

interface MatchBadgeProps {
  score: number | undefined;
  /** If true, renders a subtle pulse skeleton while scores are in-flight. */
  loading?: boolean;
}

function ringClass(score: number): string {
  if (score >= 80) return "ring-emerald-500 text-emerald-300 bg-emerald-500/10";
  if (score >= 60) return "ring-amber-500 text-amber-300 bg-amber-500/10";
  return "ring-zinc-600 text-zinc-400 bg-zinc-800/60";
}

export function MatchBadge({ score, loading }: MatchBadgeProps) {
  if (loading) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-9 animate-pulse rounded-full bg-zinc-800/60 ring-1 ring-zinc-700"
      />
    );
  }

  if (score === undefined || score === null) return null;

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div
      role="img"
      aria-label={`Match score: ${clamped} out of 100`}
      className={cn(
        "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full ring-2 text-[10px] font-semibold leading-none",
        ringClass(clamped),
      )}
    >
      <span>{clamped}</span>
      <span className="text-[8px] font-normal opacity-70">/ 100</span>
    </div>
  );
}
