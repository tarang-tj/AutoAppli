"use client";

/**
 * Score display — the dominant arcade-style "WK COUNT / TARGET" readout
 * with the segmented LED progress bar underneath. Numbers glow with
 * phosphor; the bar lights segments left-to-right as the user closes on
 * the target.
 */
import {
  DIGIT_GLOW,
  TARGET_DIGIT,
  SEGMENTS,
  SEGMENT_LIT,
  SEGMENT_DIM,
} from "./arcade-styles";

interface ScoreDisplayProps {
  weekCount: number;
  target: number;
  progressPct: number;
  segmentsLit: number;
}

export function ScoreDisplay({
  weekCount,
  target,
  progressPct,
  segmentsLit,
}: ScoreDisplayProps) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-[0.32em] mb-1.5 font-[family-name:var(--font-arcade-label)]"
        style={{ color: "rgba(0,255,136,0.55)" }}
      >
        SCORE / WK 01
      </div>
      <div
        className="flex items-end gap-2 leading-none font-[family-name:var(--font-arcade-digits)]"
        aria-label={`${weekCount} of ${target} applications this week`}
      >
        <span className="text-7xl tabular-nums leading-none" style={DIGIT_GLOW}>
          {String(weekCount).padStart(2, "0")}
        </span>
        <span
          className="pb-1 text-3xl tabular-nums leading-none"
          style={TARGET_DIGIT}
        >
          / {String(target).padStart(2, "0")}
        </span>
        <span className="ml-auto pb-1.5 text-[11px] uppercase tracking-[0.22em] font-[family-name:var(--font-arcade-label)] text-emerald-300/55">
          / {target} this week
        </span>
      </div>

      {/* Segmented LED progress bar — accessible progressbar role lives here */}
      <div
        role="progressbar"
        aria-valuenow={weekCount}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`Weekly progress: ${weekCount} of ${target}`}
        className="mt-3 flex gap-1"
      >
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 flex-1 rounded-[1px] [transition:background-color_220ms,box-shadow_220ms]"
            style={i < segmentsLit ? SEGMENT_LIT : SEGMENT_DIM}
          />
        ))}
      </div>
      <div
        className="mt-1.5 flex justify-between text-[9px] uppercase tracking-[0.25em] font-[family-name:var(--font-arcade-label)]"
        style={{ color: "rgba(0,255,136,0.4)" }}
      >
        <span>0%</span>
        <span
          className="tabular-nums"
          style={{ color: "rgba(0,255,136,0.7)" }}
        >
          {progressPct}% LOADED
        </span>
        <span>100%</span>
      </div>
    </div>
  );
}
