"use client";

import { cn } from "@/lib/utils";
import type { StoryTag } from "@/lib/stories/storage";

/**
 * Presentation bits for the StoryCard. Pulled out of story-card.tsx so
 * the card stays under 200 lines. No state, no storage — leaf nodes.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)] focus-visible:ring-[oklch(0.34_0.07_28)]";

interface EditorialLinkProps {
  active: boolean;
  onClick: () => void;
  controls: string;
  children: React.ReactNode;
}

export function EditorialLink({
  active,
  onClick,
  controls,
  children,
}: EditorialLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-controls={controls}
      className={cn(
        "italic underline decoration-dotted underline-offset-[5px] transition-colors",
        active
          ? "text-[oklch(0.32_0.07_28)] decoration-[oklch(0.32_0.07_28)]"
          : "decoration-[oklch(0.55_0.05_40_/_0.6)] hover:text-[oklch(0.32_0.07_28)] hover:decoration-[oklch(0.32_0.07_28)]",
        FOCUS_RING,
      )}
    >
      {children}
    </button>
  );
}

export function TagInk({ tag }: { tag: StoryTag }) {
  return (
    <span className="font-[family-name:var(--font-stories-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[oklch(0.20_0.025_32)]">
      <span className="ink-mark">{tag}</span>
    </span>
  );
}

export function StarRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="grid gap-1.5 md:grid-cols-[6rem_1fr] md:gap-5">
      <span className="font-[family-name:var(--font-stories-mono)] smallcaps text-[10px] tracking-[0.28em] text-[oklch(0.45_0.05_38)] pt-1.5">
        {label}
      </span>
      <p className="font-[family-name:var(--font-stories-display)] text-[1.02rem] leading-[1.7] text-[oklch(0.20_0.02_30)] whitespace-pre-wrap">
        {body}
      </p>
    </div>
  );
}
