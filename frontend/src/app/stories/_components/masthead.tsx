"use client";

import { useSyncExternalStore } from "react";

/**
 * Editorial masthead — the top of the notebook.
 *
 * Renders an asymmetric two-column header: a small-caps eyebrow and
 * generous serif title on the left; a magazine-style issue plate on
 * the right (volume, today's date, total entry count). The date is
 * read via useSyncExternalStore so SSR / first paint render an empty
 * string (avoiding a server/client timezone mismatch) and the client
 * fills it in after hydration without a setState-in-effect.
 */

interface MastheadProps {
  count: number;
  onAdd: () => void;
}

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatToday(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")} · ${d.getFullYear()}`;
}

// useSyncExternalStore wants stable references. The masthead date does
// not change while the page is open; we subscribe to nothing and read
// the formatted string on demand on the client only.
const subscribeNoop = (): (() => void) => () => {};
const getTodaySnapshot = (): string => formatToday();
const getTodayServerSnapshot = (): string => "";

export function Masthead({ count, onAdd }: MastheadProps) {
  const today = useSyncExternalStore(
    subscribeNoop,
    getTodaySnapshot,
    getTodayServerSnapshot,
  );

  return (
    <header className="mb-10 md:mb-14">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p
            className="font-[family-name:var(--font-stories-mono)] smallcaps text-[11px] tracking-[0.32em] text-[oklch(0.42_0.06_38)]"
          >
            Story Library · Vol. I · Personal Edition
          </p>
          <h1
            className="mt-3 font-[family-name:var(--font-stories-display)] text-[clamp(2.4rem,6vw,4rem)] font-medium leading-[0.96] tracking-[-0.015em] text-[oklch(0.16_0.02_30)]"
          >
            <span className="italic font-normal text-[oklch(0.34_0.06_30)]">The</span> Field
            <br className="hidden sm:block" /> Notebook
          </h1>
          <p
            className="mt-5 max-w-xl font-[family-name:var(--font-stories-display)] text-[1.05rem] leading-[1.65] text-[oklch(0.30_0.025_35)]"
          >
            <span className="italic">A working archive of moments that taught you something.</span>
            {" "}Bank a story once. Bring it to every interview.
          </p>
        </div>

        <aside
          aria-label="Issue plate"
          className="font-[family-name:var(--font-stories-mono)] text-[11px] tracking-[0.18em] text-[oklch(0.42_0.06_38)] md:text-right"
        >
          <div className="border-y border-[oklch(0.55_0.05_40_/_0.35)] py-2 md:py-3 md:min-w-[12rem]">
            <div className="flex items-center justify-between gap-6 md:flex-col md:items-end md:gap-1">
              <span>{today || "\u00A0"}</span>
              <span>
                <span className="text-[oklch(0.16_0.02_30)] font-medium">{count}</span>
                {" "}{count === 1 ? "entry" : "entries"} filed
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add a story"
            className="mt-4 inline-flex items-center gap-2 rounded-none border border-[oklch(0.18_0.02_30)] bg-[oklch(0.18_0.02_30)] px-4 py-2.5 text-[11px] tracking-[0.2em] text-[oklch(0.97_0.012_85)] transition-colors hover:bg-[oklch(0.32_0.07_28)] hover:border-[oklch(0.32_0.07_28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)] focus-visible:ring-[oklch(0.34_0.07_28)]"
          >
            <span aria-hidden="true">+</span>
            File a new entry
            <kbd
              aria-label="keyboard shortcut: n"
              className="ml-1 hidden md:inline-flex h-4 min-w-4 items-center justify-center rounded-sm bg-[oklch(0.97_0.012_85_/_0.18)] px-1 text-[10px] tracking-normal"
            >
              n
            </kbd>
          </button>
        </aside>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <span className="h-px flex-1 rule-fancy" />
        <span
          aria-hidden="true"
          className="font-[family-name:var(--font-stories-display)] italic text-[oklch(0.45_0.05_38)]"
        >
          ※
        </span>
        <span className="h-px flex-1 rule-fancy" />
      </div>
    </header>
  );
}
