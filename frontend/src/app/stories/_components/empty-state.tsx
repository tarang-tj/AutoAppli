"use client";

/**
 * EmptyState — first-run / cleared-library prompt.
 *
 * Poetic, encouraging, light. The visual conceit is an open notebook
 * page with a single ruled line waiting for the first entry. Avoids
 * the "no items found" supermarket tone of typical empty states.
 */

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <section
      role="status"
      aria-label="Empty library"
      className="mx-auto mt-6 max-w-2xl text-center"
    >
      <p className="font-[family-name:var(--font-stories-mono)] smallcaps text-[11px] tracking-[0.32em] text-[oklch(0.45_0.05_38)]">
        — A blank page —
      </p>
      <h2 className="mt-6 font-[family-name:var(--font-stories-display)] text-[clamp(1.6rem,3.4vw,2.2rem)] font-normal italic leading-[1.15] text-[oklch(0.20_0.02_30)]">
        An empty notebook.
        <br />
        Start with a moment that taught you something.
      </h2>
      <p className="mx-auto mt-5 max-w-md font-[family-name:var(--font-stories-display)] text-[1rem] leading-[1.7] text-[oklch(0.32_0.025_35)]">
        One entry is one example: four short paragraphs about a
        situation, a task, what you did, and what changed because of it.
        Eight to ten of these and most behavioral interviews quietly
        become rehearsal.
      </p>

      <div className="mt-9 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onAdd}
          aria-label="File the first entry"
          className="inline-flex items-center gap-2 rounded-none border border-[oklch(0.18_0.02_30)] bg-[oklch(0.18_0.02_30)] px-5 py-3 font-[family-name:var(--font-stories-mono)] text-[11px] tracking-[0.22em] text-[oklch(0.97_0.012_85)] transition-colors hover:bg-[oklch(0.32_0.07_28)] hover:border-[oklch(0.32_0.07_28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)] focus-visible:ring-[oklch(0.34_0.07_28)]"
        >
          File the first entry
        </button>
        <p className="font-[family-name:var(--font-stories-ui)] text-[12px] text-[oklch(0.45_0.04_38)]">
          or press{" "}
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-[oklch(0.55_0.05_40_/_0.45)] bg-[oklch(0.97_0.012_85)] px-1.5 font-[family-name:var(--font-stories-mono)] text-[11px]">
            n
          </kbd>{" "}
          to begin
        </p>
      </div>

      <svg
        aria-hidden="true"
        viewBox="0 0 320 60"
        className="mx-auto mt-12 w-64 text-[oklch(0.55_0.05_40_/_0.4)]"
      >
        <path
          d="M2 30 Q 80 12, 160 30 T 318 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      </svg>
    </section>
  );
}
