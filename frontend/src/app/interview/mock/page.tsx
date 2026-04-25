import { Suspense } from "react";
import { MockInterviewUI } from "./mock-interview-ui";

/**
 * /interview/mock — AI Mock Interview page.
 *
 * Wraps MockInterviewUI in Suspense so Next.js can statically prerender
 * the shell without erroring on client-only hooks. Fallback is a
 * stage-themed loading state, matching the theatrical aesthetic of
 * the live UI (no flash of generic zinc).
 */
export default function MockInterviewPage() {
  return (
    <Suspense fallback={<StageCurtainFallback />}>
      <MockInterviewUI />
    </Suspense>
  );
}

function StageCurtainFallback() {
  return (
    <div
      className="relative flex min-h-[100dvh] w-full items-center justify-center font-[family-name:var(--font-mock-mono)]"
      style={{ background: "oklch(0.085 0.014 268)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 35%, color-mix(in oklch, oklch(0.78 0.16 65) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-3 text-[0.7rem] uppercase tracking-[0.32em] text-[color:oklch(0.84_0.018_78)]">
        <span
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ background: "oklch(0.78 0.16 65)" }}
        />
        <span>Lights coming up…</span>
      </div>
    </div>
  );
}
