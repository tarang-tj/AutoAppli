/**
 * Stage atmosphere — shared visual furniture for the mock interview surface.
 *
 *   <StageBackdrop>     full-bleed near-black backdrop with layered radial
 *                       spotlight, cool ambient rim light, and SVG film
 *                       grain. Wraps every stage of the flow.
 *   <CurtainEdge>       vertical ribbed velvet at left/right edges; evokes
 *                       a stage curtain framing the action.
 *   <FilmGrainSvg>      reusable noise pattern (referenced by id="grain").
 *
 * All effects are CSS / SVG only — no extra deps, respects
 * prefers-reduced-motion (handled at component level by avoiding
 * keyframe motion here).
 */

import { ReactNode } from "react";

// Color tokens — scoped to this surface, NOT promoted to globals.css.
// ink:    near-black warm navy backdrop
// ember:  spotlight amber accent
// bone:   warm off-white text on the ink
// velvet: the curtain shadow
const STAGE_TOKENS = `
  --stage-ink: oklch(0.13 0.018 268);
  --stage-ink-deep: oklch(0.085 0.014 268);
  --stage-bone: oklch(0.965 0.014 78);
  --stage-bone-dim: oklch(0.84 0.018 78);
  --stage-ember: oklch(0.78 0.16 65);
  --stage-ember-deep: oklch(0.62 0.18 50);
  --stage-velvet: oklch(0.18 0.04 18);
  --stage-rule: oklch(1 0 0 / 0.08);
`;

export function FilmGrainSvg() {
  return (
    <svg
      aria-hidden
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <filter id="mock-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0.9 0"
          />
        </filter>
        <pattern
          id="mock-grain-pattern"
          x="0"
          y="0"
          width="240"
          height="240"
          patternUnits="userSpaceOnUse"
        >
          <rect width="240" height="240" filter="url(#mock-grain)" opacity="0.45" />
        </pattern>
      </defs>
    </svg>
  );
}

export function CurtainEdge({ side }: { side: "left" | "right" }) {
  // Vertical ribbed velvet: a stack of thin gradient stripes.
  // Hidden under 1024px to preserve breathing room on tablet/mobile.
  return (
    <div
      aria-hidden
      className="hidden lg:block pointer-events-none absolute top-0 bottom-0 w-[6.5rem] z-[1]"
      style={{
        [side]: 0,
        background:
          side === "left"
            ? `linear-gradient(90deg,
                var(--stage-velvet) 0%,
                color-mix(in oklch, var(--stage-velvet) 60%, transparent) 55%,
                transparent 100%),
               repeating-linear-gradient(90deg,
                rgba(255,255,255,0.025) 0 1px,
                transparent 1px 14px)`
            : `linear-gradient(270deg,
                var(--stage-velvet) 0%,
                color-mix(in oklch, var(--stage-velvet) 60%, transparent) 55%,
                transparent 100%),
               repeating-linear-gradient(90deg,
                rgba(255,255,255,0.025) 0 1px,
                transparent 1px 14px)`,
      }}
    />
  );
}

interface StageBackdropProps {
  children: ReactNode;
  /** When true (active stage), layer a hot center spotlight. */
  spotlightHot?: boolean;
}

export function StageBackdrop({
  children,
  spotlightHot = false,
}: StageBackdropProps) {
  return (
    <div
      className="relative isolate min-h-[100dvh] w-full overflow-hidden font-[family-name:var(--font-mock-display)] text-[color:var(--stage-bone)]"
      style={
        {
          background: `var(--stage-ink-deep)`,
          // Inject scoped tokens once at the wrapper so descendants can use them.
          ...Object.fromEntries(
            STAGE_TOKENS.trim()
              .split(";")
              .filter(Boolean)
              .map((line) => {
                const [k, v] = line.split(":");
                return [k.trim(), v.trim()];
              }),
          ),
        } as React.CSSProperties
      }
    >
      <FilmGrainSvg />

      {/* Layer 1 — base ambient cold rim light from above */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          background: `radial-gradient(120% 80% at 50% -10%,
            color-mix(in oklch, var(--stage-bone) 6%, transparent) 0%,
            transparent 55%)`,
        }}
      />

      {/* Layer 2 — warm spotlight center */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 transition-opacity duration-700"
        style={{
          opacity: spotlightHot ? 1 : 0.55,
          background: `radial-gradient(60% 55% at 50% 35%,
            color-mix(in oklch, var(--stage-ember) 22%, transparent) 0%,
            color-mix(in oklch, var(--stage-ember) 6%, transparent) 35%,
            transparent 70%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* Layer 3 — bottom stage floor vignette */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          background: `radial-gradient(140% 60% at 50% 110%,
            color-mix(in oklch, var(--stage-velvet) 70%, transparent) 0%,
            transparent 50%)`,
        }}
      />

      {/* Layer 4 — film grain overlay */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0'/></filter><rect width='240' height='240' filter='url(%23n)'/></svg>")`,
        }}
      />

      <CurtainEdge side="left" />
      <CurtainEdge side="right" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
