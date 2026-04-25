/**
 * CallSheetHeader — eyebrow + display-serif title + subhead for the
 * setup stage. Pulled out so call-sheet-stage focuses on the form.
 *
 * The "spotlight" word is rendered with a hand-drawn SVG underline in
 * ember to give the headline a hand-marked-script feel.
 */

"use client";

export function CallSheetHeader() {
  return (
    <>
      <div className="mb-8 flex items-center gap-3 font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.28em] text-[color:var(--stage-bone-dim)]">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--stage-ember)]" />
        <span>Stage 01 · Call sheet</span>
        <span className="ml-auto tabular-nums">Take 001</span>
      </div>

      <h1 className="font-[family-name:var(--font-mock-display)] text-[2.75rem] leading-[1.02] tracking-[-0.02em] text-[color:var(--stage-bone)] sm:text-[3.75rem]">
        Step under the
        <span className="relative ml-2 inline-block italic text-[color:var(--stage-ember)]">
          spotlight
          <svg
            aria-hidden
            viewBox="0 0 280 14"
            className="absolute -bottom-1 left-0 h-3 w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M2,8 Q70,2 140,7 T278,6"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
        </span>
        .
      </h1>

      <p className="mt-6 max-w-xl font-[family-name:var(--font-mock-display)] text-lg leading-relaxed text-[color:var(--stage-bone-dim)]">
        Paste the role you&rsquo;re reading for. The interviewer takes their
        mark, the questions roll, and you get scored on every line.
      </p>
    </>
  );
}
