"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * NotebookDialogShell — the cream-paper modal frame.
 *
 * Renders the fixed backdrop, centered "page" container with paper
 * texture and torn-edge top rule, and a small "Close" affordance in
 * the top-right. Children are the form contents. ARIA attributes
 * (role / aria-modal / aria-labelledby) are wired through props so
 * the form retains ownership of its label id.
 *
 * The component is forwardRef'd so the parent's focus trap hook can
 * point at the dialog container.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)] focus-visible:ring-[oklch(0.34_0.07_28)]";

interface NotebookDialogShellProps {
  ariaLabelledBy: string;
  onBackdropClose: () => void;
  onCloseClick: () => void;
  children: React.ReactNode;
}

export const NotebookDialogShell = forwardRef<
  HTMLDivElement,
  NotebookDialogShellProps
>(function NotebookDialogShell(
  { ariaLabelledBy, onBackdropClose, onCloseClick, children },
  ref,
) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[oklch(0.20_0.025_30_/_0.55)] p-4 pt-[6vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBackdropClose();
      }}
    >
      <div
        ref={ref}
        className="relative w-full max-w-2xl bg-[oklch(0.97_0.012_85)] text-[oklch(0.18_0.018_35)] shadow-[0_30px_80px_-20px_oklch(0.20_0.025_30_/_0.45)]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18 0 0 0 0 0.16 0 0 0 0 0.13 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "180px 180px",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1.5"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.55 0.05 40 / 0.35) 8%, oklch(0.55 0.05 40 / 0.35) 92%, transparent)",
          }}
        />
        <button
          type="button"
          aria-label="Close story form"
          onClick={onCloseClick}
          className={cn(
            "absolute right-4 top-4 font-[family-name:var(--font-stories-mono)] text-[10px] tracking-[0.28em] uppercase text-[oklch(0.40_0.05_38)] hover:text-[oklch(0.32_0.07_28)]",
            FOCUS_RING,
          )}
        >
          Close ✕
        </button>
        {children}
      </div>
    </div>
  );
});
