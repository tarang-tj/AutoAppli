import type { Metadata } from "next";
import { Lora, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Story Library — scoped fonts + editorial canvas.
 *
 * The Library is the only authenticated surface that runs in a warm,
 * paper-toned palette with serif display type. Fonts are loaded with
 * `next/font/google` and exposed as CSS variables so children can opt in
 * via `font-[var(--font-stories-display)]` etc. without affecting the
 * rest of the app shell.
 *
 *   --font-stories-display  Lora            — transitional serif, body & headings
 *   --font-stories-ui       Inter Tight     — UI chrome, buttons, metadata
 *   --font-stories-mono     JetBrains Mono  — small-caps tag chips, page numbers
 *
 * The warm "newsprint" backdrop is applied via a wrapper that overflows
 * the AppShell's <main> padding and re-paints the surface — this keeps
 * the dashboard's dark theme intact everywhere else.
 */

export const metadata: Metadata = {
  title: "The Field Notebook · Story Library",
  description:
    "Bank STAR-format stories once, reuse them across every interview. Tag-driven mapping shows which questions each story can answer.",
  robots: { index: false, follow: false },
};

const display = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-stories-display",
});

const ui = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-stories-ui",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-stories-mono",
});

export default function StoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div
        className={`${display.variable} ${ui.variable} ${mono.variable} stories-canvas`}
      >
        {children}
      </div>
      {/* Scoped styles for the editorial canvas. Lives in layout so the
          stylesheet is loaded only on /stories. Uses :where() to keep
          specificity low so children can still override. */}
      <style>{`
        .stories-canvas {
          /* Overflow AppShell's p-6 so the cream surface meets the
             sidebar / header edges. Negative margins on all sides + the
             matching padding keep content where it was. */
          margin: -1.5rem;
          padding: 2.5rem clamp(1.5rem, 4vw, 4.5rem) 6rem;
          min-height: calc(100vh - 4rem);
          background-color: oklch(0.965 0.012 85);
          color: oklch(0.18 0.018 35);
          font-family: var(--font-stories-display), Georgia, "Times New Roman", serif;
          /* Subtle paper grain — SVG noise data-URI at very low opacity.
             ~14kb gz-equiv inline; load once, no extra round-trip. */
          background-image:
            radial-gradient(circle at 50% 0%, oklch(0.985 0.012 85 / 0.6) 0%, transparent 60%),
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.18 0 0 0 0 0.16 0 0 0 0 0.13 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: auto, 180px 180px;
        }
        .stories-canvas :where(*, *::before, *::after) {
          border-color: oklch(0.78 0.022 60 / 0.6);
        }
        /* Marker-highlight: a soft ochre ink stroked across the text
           baseline. box-decoration-break: clone makes it survive line
           wraps the way a real highlighter would. */
        .stories-canvas .ink-mark {
          background-image: linear-gradient(
            180deg,
            transparent 0%,
            transparent 38%,
            oklch(0.88 0.115 78 / 0.55) 38%,
            oklch(0.88 0.115 78 / 0.55) 86%,
            transparent 86%
          );
          padding: 0 0.18em;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        .stories-canvas .ink-mark--oxblood {
          background-image: linear-gradient(
            180deg,
            transparent 0%,
            transparent 38%,
            oklch(0.62 0.155 28 / 0.18) 38%,
            oklch(0.62 0.155 28 / 0.18) 86%,
            transparent 86%
          );
        }
        .stories-canvas .rule-fancy {
          background-image: linear-gradient(
            90deg,
            transparent,
            oklch(0.55 0.05 40 / 0.35) 12%,
            oklch(0.55 0.05 40 / 0.35) 88%,
            transparent
          );
        }
        /* Drop-cap-ish small-caps STAR labels. */
        .stories-canvas .smallcaps {
          font-variant-caps: all-small-caps;
          letter-spacing: 0.14em;
        }
      `}</style>
    </AppShell>
  );
}
