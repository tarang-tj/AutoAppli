/**
 * Shared visual constants for the GoalTracker arcade-scoreboard skin.
 * Inline style objects are kept here so the main component file stays
 * readable. Tailwind handles layout/typography; these styles handle
 * effects Tailwind can't express cleanly (multi-stop text-shadow, repeating
 * scanline gradient, vignette inset shadow).
 */
import type { CSSProperties } from "react";

/** Number of segments in the LED progress bar. */
export const SEGMENTS = 10;

/** CRT phosphor accent — warm green, holds against zinc-950 backdrop. */
export const PHOSPHOR = "#00ff88";

export const SCANLINES: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px)",
};

export const VIGNETTE: CSSProperties = {
  boxShadow:
    "inset 0 0 60px rgba(0,0,0,0.55), inset 0 0 12px rgba(0,255,136,0.04)",
};

export const DIGIT_GLOW: CSSProperties = {
  color: PHOSPHOR,
  textShadow: `0 0 6px ${PHOSPHOR}, 0 0 14px rgba(0,255,136,0.55), 0 0 28px rgba(0,255,136,0.25)`,
};

export const TARGET_DIGIT: CSSProperties = {
  color: "rgba(0,255,136,0.45)",
  textShadow: "0 0 4px rgba(0,255,136,0.35)",
};

export const LABEL_GLOW: CSSProperties = {
  color: "rgba(0,255,136,0.85)",
  textShadow: "0 0 6px rgba(0,255,136,0.35)",
};

export const TOP_EDGE: CSSProperties = {
  background: `linear-gradient(to right, transparent, ${PHOSPHOR}, transparent)`,
  opacity: 0.55,
};

export const POWER_DOT: CSSProperties = {
  background: PHOSPHOR,
  boxShadow: `0 0 8px ${PHOSPHOR}, 0 0 14px ${PHOSPHOR}`,
};

export const SEGMENT_LIT: CSSProperties = {
  background: PHOSPHOR,
  boxShadow: `0 0 6px ${PHOSPHOR}, 0 0 12px rgba(0,255,136,0.5)`,
};

export const SEGMENT_DIM: CSSProperties = {
  background: "rgba(0,255,136,0.08)",
  boxShadow: "inset 0 0 0 1px rgba(0,255,136,0.12)",
};
