/**
 * AnswerComposer — the textarea + submit button block for the active stage.
 *
 * Pulled out so spotlight-stage.tsx can focus on the dialogue layout.
 * Looks like a script editor: mono labels, char counter, kbd hint,
 * ember "Deliver" CTA. Cmd+Enter submits.
 */

"use client";

import { ArrowUp } from "lucide-react";

interface AnswerComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export function AnswerComposer({
  value,
  onChange,
  onSubmit,
  submitting,
}: AnswerComposerProps) {
  const canSubmit = !submitting && value.trim().length > 0;

  return (
    <section
      aria-label="Your answer"
      className="mt-10 rounded-sm border border-[color:var(--stage-rule)] bg-[color:color-mix(in_oklch,var(--stage-ink)_88%,transparent)] backdrop-blur-sm"
      style={{
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 -8px 32px -8px color-mix(in oklch, var(--stage-ember) 14%, transparent)",
      }}
    >
      <div className="flex items-center justify-between border-b border-[color:var(--stage-rule)] px-4 py-2.5 font-[family-name:var(--font-mock-mono)] text-[0.66rem] uppercase tracking-[0.24em] text-[color:var(--stage-bone-dim)]">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--stage-ember)]" />
          <span>You · Take</span>
        </div>
        <span className="tabular-nums">{value.length} chars</span>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="STAR your answer — situation, task, action, result."
        rows={4}
        disabled={submitting}
        aria-label="Your answer"
        className="block w-full resize-none bg-transparent px-4 py-4 font-[family-name:var(--font-mock-mono)] leading-relaxed text-[color:var(--stage-bone)] placeholder:text-[color:color-mix(in_oklch,var(--stage-bone-dim)_55%,transparent)] focus:outline-none disabled:opacity-50"
        style={{ fontSize: "16px" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--stage-rule)] px-4 py-2.5">
        <p className="font-[family-name:var(--font-mock-mono)] text-[0.66rem] uppercase tracking-[0.22em] text-[color:color-mix(in_oklch,var(--stage-bone-dim)_75%,transparent)]">
          <kbd className="rounded-sm border border-[color:var(--stage-rule)] bg-[color:color-mix(in_oklch,var(--stage-bone)_8%,transparent)] px-1.5 py-0.5 text-[0.6rem]">
            ⌘
          </kbd>
          <span className="mx-1">+</span>
          <kbd className="rounded-sm border border-[color:var(--stage-rule)] bg-[color:color-mix(in_oklch,var(--stage-bone)_8%,transparent)] px-1.5 py-0.5 text-[0.6rem]">
            ↵
          </kbd>
          <span className="ml-2">to deliver</span>
        </p>
        <button
          data-testid="mock-submit-answer"
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-busy={submitting}
          className="group/submit inline-flex items-center gap-2 rounded-sm border border-[color:color-mix(in_oklch,var(--stage-ember)_50%,transparent)] px-4 py-2 font-[family-name:var(--font-mock-mono)] text-[0.72rem] uppercase tracking-[0.22em] text-[color:var(--stage-ink-deep)] transition-all hover:tracking-[0.28em] disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background:
              "linear-gradient(180deg, var(--stage-ember) 0%, var(--stage-ember-deep) 100%)",
            boxShadow:
              "0 1px 0 rgba(255,255,255,0.25) inset, 0 6px 18px -6px color-mix(in oklch, var(--stage-ember) 50%, transparent)",
          }}
        >
          <span>{submitting ? "Delivering" : "Deliver"}</span>
          <ArrowUp
            aria-hidden
            className="h-3.5 w-3.5 transition-transform group-hover/submit:-translate-y-0.5"
          />
        </button>
      </div>
    </section>
  );
}
