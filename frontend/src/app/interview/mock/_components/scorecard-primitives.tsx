/**
 * Scorecard sub-pieces for the curtain-call stage.
 *
 *   <Stars>          1-5 ember stars derived from a 0-100 overall score.
 *   <DimensionRow>   one dimension's row — label, 20-segment ticker
 *                    meter, big tabular numeral.
 *   <ReviewCard>     a "critic's review" card — title in italic serif,
 *                    bulleted notes in display serif with a symbol bullet.
 */

"use client";

import { Star } from "lucide-react";

export function Stars({ overall }: { overall: number }) {
  // 0-100 → 1-5 stars (ceil so 60 = 3, 81 = 5).
  const filled = Math.max(1, Math.min(5, Math.ceil(overall / 20)));
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4"
          fill={i < filled ? "currentColor" : "transparent"}
          stroke="currentColor"
          style={{
            color:
              i < filled
                ? "var(--stage-ember)"
                : "color-mix(in oklch, var(--stage-bone-dim) 40%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

export function DimensionRow({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  // 20-segment "ticker tape" meter. Each segment = 5 pts.
  const segments = 20;
  const filled = Math.round((score / 100) * segments);
  return (
    <li className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr_3rem] sm:items-center sm:gap-5">
      <div className="font-[family-name:var(--font-mock-mono)] text-[0.78rem] uppercase tracking-[0.18em] text-[color:var(--stage-bone)]">
        {label}
      </div>
      <div
        className="flex h-3 items-center gap-[3px]"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="h-full flex-1 rounded-[1px]"
            style={{
              background:
                i < filled
                  ? "var(--stage-ember)"
                  : "color-mix(in oklch, var(--stage-bone-dim) 14%, transparent)",
              boxShadow:
                i < filled && i === filled - 1
                  ? "0 0 8px color-mix(in oklch, var(--stage-ember) 70%, transparent)"
                  : "none",
            }}
          />
        ))}
      </div>
      <div className="font-[family-name:var(--font-mock-display)] text-2xl tabular-nums text-[color:var(--stage-bone)]">
        {score}
      </div>
    </li>
  );
}

export function ReviewCard({
  title,
  subtitle,
  symbol,
  accent,
  items,
}: {
  title: string;
  subtitle: string;
  symbol: string;
  accent: "ember" | "bone";
  items: string[];
}) {
  const accentColor =
    accent === "ember" ? "var(--stage-ember)" : "var(--stage-bone)";
  return (
    <section
      className="rounded-sm border border-[color:var(--stage-rule)] bg-[color:color-mix(in_oklch,var(--stage-ink)_88%,transparent)] p-6"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 30px -12px rgba(0,0,0,0.5)",
      }}
    >
      <div className="mb-1 font-[family-name:var(--font-mock-mono)] text-[0.66rem] uppercase tracking-[0.28em] text-[color:var(--stage-bone-dim)]">
        {subtitle}
      </div>
      <h4
        className="mb-5 font-[family-name:var(--font-mock-display)] text-xl italic"
        style={{ color: accentColor }}
      >
        {title}
      </h4>
      <ul className="space-y-3">
        {items.length === 0 && (
          <li className="font-[family-name:var(--font-mock-mono)] text-sm text-[color:var(--stage-bone-dim)]">
            — no notes —
          </li>
        )}
        {items.map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 font-[family-name:var(--font-mock-display)] text-[0.98rem] leading-relaxed text-[color:var(--stage-bone)]"
          >
            <span
              aria-hidden
              className="mt-1 flex-shrink-0 font-[family-name:var(--font-mock-mono)] text-[0.95rem]"
              style={{ color: accentColor }}
            >
              {symbol}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
