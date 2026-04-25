/**
 * Centralized re-exports of heavy components loaded via next/dynamic.
 *
 * Why: Reduces initial JS bundle for routes that import these eagerly.
 * Each export here pulls its underlying module into a separate webpack
 * chunk fetched only when the component first renders.
 *
 * Conventions:
 *   - `ssr: false` for client-only components that touch `window` / DOM
 *     APIs or are gated behind a tab/state the server can never need.
 *   - Provide a `loading` skeleton sized to the real component so the
 *     surrounding layout doesn't jump on chunk arrival.
 *   - The `.then(m => ({ default: m.X }))` shape adapts named exports for
 *     `next/dynamic`, which expects a default export.
 *
 * This file is `.ts` (not `.tsx`) by design — placeholders below use
 * `React.createElement` so the module stays JSX-free and importable from
 * anywhere without TS/JSX config friction.
 */
import { createElement, type ReactElement } from "react";
import dynamic from "next/dynamic";

// ── ResumeDiffView ────────────────────────────────────────────────────
// 586-line component + per-line word-diff math. Only renders on the Diff
// tab of the resume preview (one of four tabs); most users never click it.
// Skeleton matches the diff-view dimensions: heading row + 8 line rows so
// the layout doesn't jump when the chunk lands.

function ResumeDiffSkeleton(): ReactElement {
  const headingRow = createElement(
    "div",
    { className: "mb-4 flex items-center justify-between" },
    createElement("div", {
      className: "h-5 w-40 animate-pulse rounded bg-zinc-800",
    }),
    createElement("div", {
      className: "h-7 w-32 animate-pulse rounded bg-zinc-800",
    }),
  );
  const rows = Array.from({ length: 8 }).map((_, i) =>
    createElement("div", {
      key: i,
      className: "h-5 w-full animate-pulse rounded bg-zinc-900",
    }),
  );
  return createElement(
    "div",
    {
      className: "rounded-md border border-zinc-800 bg-zinc-950 p-4",
      "aria-busy": "true",
      "aria-live": "polite",
    },
    headingRow,
    createElement("div", { className: "space-y-2" }, ...rows),
  );
}

export const ResumeDiffView = dynamic(
  () =>
    import("@/components/resume/resume-diff-view").then((m) => ({
      default: m.ResumeDiffView,
    })),
  {
    ssr: false,
    loading: () => ResumeDiffSkeleton(),
  },
);
