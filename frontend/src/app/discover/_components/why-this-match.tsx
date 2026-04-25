"use client";
/**
 * Per-result expander rendering the `explanations` dict from
 * /api/v1/match/scores. One short line per dimension.
 *
 * Renders nothing when `explanations` is missing or empty so the layout
 * gracefully degrades when the backend hasn't populated the field yet.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhyThisMatchProps {
  /** dimension → human-readable reason, returned by the match service */
  explanations: Record<string, string> | null | undefined;
  /** id used for aria-controls wiring */
  id: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  skills: "Skills",
  title: "Title",
  seniority: "Seniority",
  location: "Location",
  remote: "Remote",
  recency: "Posting recency",
  salary: "Salary",
};

export function WhyThisMatch({ explanations, id }: WhyThisMatchProps) {
  const [open, setOpen] = useState(false);

  if (!explanations || Object.keys(explanations).length === 0) return null;

  const entries = Object.entries(explanations).filter(
    ([, reason]) => reason && reason.trim().length > 0,
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex items-center gap-1 rounded text-[11px] text-zinc-400 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-3 w-3 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
        Why this match
      </button>
      {open ? (
        <ul
          id={id}
          className="mt-1.5 space-y-1 rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-2 text-[11px] text-zinc-300"
        >
          {entries.map(([dim, reason]) => (
            <li key={dim} className="flex gap-1.5">
              <span className="shrink-0 font-medium text-zinc-200">
                {DIMENSION_LABELS[dim] ?? dim}:
              </span>
              <span className="text-zinc-400">{reason}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
