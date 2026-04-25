/**
 * CurtainCallStage — the "complete" view, the post-show scorecard.
 *
 * Visual metaphor: the curtain falls, the lights come back up. Big
 * tabular-numeral overall score in display serif (think: theater
 * marquee). Dimension scores rendered with a typewriter-style
 * breakdown. Strengths and notes printed like a critic's review on
 * warm bone-colored cards.
 *
 * Score primitives (Stars, DimensionRow, ReviewCard) live in
 * scorecard-primitives.tsx so this file stays focused on layout.
 */

"use client";

import Link from "next/link";
import { RotateCcw, ArrowUpRight } from "lucide-react";
import type { EndResponse } from "@/lib/mock-interview/api";
import {
  Stars,
  DimensionRow,
  ReviewCard,
} from "./scorecard-primitives";

const DIMENSION_LABELS: Record<string, string> = {
  clarity: "Clarity",
  structure: "Structure",
  specificity: "Specificity",
  relevance: "Relevance",
};

interface CurtainCallStageProps {
  card: EndResponse;
  onReset: () => void;
}

export function CurtainCallStage({ card, onReset }: CurtainCallStageProps) {
  const verdict =
    card.overall >= 80
      ? "Standing ovation. Polish the small details and you're ready."
      : card.overall >= 60
        ? "Solid performance. A few more rehearsals and the specifics will land."
        : "Good first read. Tighten the STAR structure and concrete examples.";

  return (
    <main
      data-testid="mock-end-summary"
      className="relative mx-auto max-w-5xl px-6 py-12 sm:py-16 lg:px-12"
    >
      {/* Eyebrow */}
      <div className="mb-6 flex items-center gap-3 font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.28em] text-[color:var(--stage-bone-dim)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--stage-ember)]" />
        <span>Curtain call · Take 001</span>
        <span className="ml-auto tabular-nums">Wrap</span>
      </div>

      <h1 className="font-[family-name:var(--font-mock-display)] text-[2.5rem] leading-[1.02] tracking-[-0.02em] text-[color:var(--stage-bone)] sm:text-[3.4rem]">
        That&rsquo;s a{" "}
        <span className="italic text-[color:var(--stage-ember)]">wrap</span>.
      </h1>
      <p className="mt-4 max-w-xl font-[family-name:var(--font-mock-display)] text-lg leading-relaxed text-[color:var(--stage-bone-dim)]">
        {verdict}
      </p>

      {/* Marquee score — oversized number + critic's read */}
      <section
        aria-labelledby="overall-heading"
        className="relative mt-12 grid grid-cols-1 gap-6 overflow-hidden rounded-sm border border-[color:var(--stage-rule)] bg-[color:color-mix(in_oklch,var(--stage-ink)_92%,transparent)] p-8 backdrop-blur-sm sm:grid-cols-[auto_1fr] sm:gap-12 sm:p-10"
        style={{
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.04) inset, 0 32px 80px -24px rgba(0,0,0,0.7)",
        }}
      >
        {/* Spotlight bloom */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-12 -top-12 -z-10 h-48"
          style={{
            background:
              "radial-gradient(60% 80% at 30% 50%, color-mix(in oklch, var(--stage-ember) 25%, transparent) 0%, transparent 70%)",
          }}
        />

        <div className="flex items-center gap-6">
          <div
            aria-label={`Overall score: ${card.overall} out of 100`}
            className="font-[family-name:var(--font-mock-display)] text-[7rem] font-black leading-[0.85] tabular-nums text-[color:var(--stage-bone)] sm:text-[9rem]"
            style={{
              textShadow:
                "0 0 40px color-mix(in oklch, var(--stage-ember) 35%, transparent), 0 4px 0 color-mix(in oklch, var(--stage-velvet) 60%, transparent)",
            }}
          >
            {card.overall}
          </div>
          <div className="flex flex-col gap-1.5 self-end pb-4 font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.24em] text-[color:var(--stage-bone-dim)]">
            <span className="tabular-nums text-[color:var(--stage-bone)]">/ 100</span>
            <span>Overall</span>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4">
          <h2
            id="overall-heading"
            className="font-[family-name:var(--font-mock-display)] text-2xl italic text-[color:var(--stage-bone)]"
          >
            The Critic&rsquo;s Read
          </h2>
          <Stars overall={card.overall} />
          <p className="font-[family-name:var(--font-mock-display)] text-base leading-relaxed text-[color:var(--stage-bone-dim)]">
            Four dimensions scored on a 100-point scale. Lower numbers point
            at where to rehearse next.
          </p>
        </div>
      </section>

      {/* Dimensions — typewriter scorecard */}
      <section
        aria-labelledby="dim-heading"
        className="mt-8 rounded-sm border border-[color:var(--stage-rule)] bg-[color:color-mix(in_oklch,var(--stage-ink)_88%,transparent)] p-6 sm:p-8"
      >
        <h3
          id="dim-heading"
          className="mb-6 flex items-baseline justify-between font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.28em] text-[color:var(--stage-bone-dim)]"
        >
          <span>Scorecard breakdown</span>
          <span className="tabular-nums">04 dimensions</span>
        </h3>

        <ul className="space-y-5">
          {Object.entries(card.dimensions).map(([key, val]) => (
            <DimensionRow
              key={key}
              label={DIMENSION_LABELS[key] ?? key}
              score={val}
            />
          ))}
        </ul>
      </section>

      {/* Reviews */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ReviewCard
          title="What landed"
          subtitle="Strengths"
          accent="ember"
          symbol="✦"
          items={card.top_strengths}
        />
        <ReviewCard
          title="Next rehearsal"
          subtitle="Notes from the director"
          accent="bone"
          symbol="→"
          items={card.top_improvements}
        />
      </div>

      {/* Actions */}
      <div className="mt-10 flex flex-wrap gap-4">
        <button
          onClick={onReset}
          className="group/again inline-flex items-center gap-2 rounded-sm border border-[color:var(--stage-rule)] bg-[color:color-mix(in_oklch,var(--stage-ink)_70%,transparent)] px-5 py-3 font-[family-name:var(--font-mock-mono)] text-[0.72rem] uppercase tracking-[0.24em] text-[color:var(--stage-bone)] transition-all hover:border-[color:color-mix(in_oklch,var(--stage-ember)_40%,transparent)] hover:bg-[color:color-mix(in_oklch,var(--stage-ember)_8%,transparent)]"
        >
          <RotateCcw
            aria-hidden
            className="h-3.5 w-3.5 transition-transform group-hover/again:-rotate-90"
          />
          <span>Run it again</span>
        </button>
        <Link
          href="/stories?from=mock"
          className="group/save inline-flex items-center gap-2 rounded-sm border border-[color:color-mix(in_oklch,var(--stage-ember)_50%,transparent)] px-5 py-3 font-[family-name:var(--font-mock-mono)] text-[0.72rem] uppercase tracking-[0.24em] text-[color:var(--stage-ink-deep)] transition-all hover:tracking-[0.28em]"
          style={{
            background:
              "linear-gradient(180deg, var(--stage-ember) 0%, var(--stage-ember-deep) 100%)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.25) inset, 0 6px 18px -6px color-mix(in oklch, var(--stage-ember) 50%, transparent)",
          }}
        >
          <span>Save to story library</span>
          <ArrowUpRight
            aria-hidden
            className="h-3.5 w-3.5 transition-transform group-hover/save:translate-x-0.5 group-hover/save:-translate-y-0.5"
          />
        </Link>
      </div>
    </main>
  );
}
