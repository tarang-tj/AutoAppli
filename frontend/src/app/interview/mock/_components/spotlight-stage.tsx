/**
 * SpotlightStage — the "active" view, the actual interview-in-progress.
 *
 * Visual metaphor: the AI question is centered on stage under a hot
 * amber spotlight, in big italic display serif (Fraunces). Past
 * exchanges become script lines stacked above the active question.
 * The user's answer field reads like a script being typed live in mono.
 *
 * Dialogue presentation primitives (DropCapText, ScriptLine) live in
 * dialogue-line.tsx so this file can stay focused on layout + flow.
 */

"use client";

import { useEffect, useRef } from "react";
import {
  DropCapText,
  ScriptLine,
  type DialogueLine,
} from "./dialogue-line";
import { AnswerComposer } from "./answer-composer";

export type { DialogueLine };

interface SpotlightStageProps {
  totalQuestions: number;
  questionIndex: number;
  messages: DialogueLine[];
  currentAnswer: string;
  setCurrentAnswer: (v: string) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}

export function SpotlightStage({
  totalQuestions,
  questionIndex,
  messages,
  currentAnswer,
  setCurrentAnswer,
  submitting,
  error,
  onSubmit,
}: SpotlightStageProps) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, submitting]);

  // The "active" line — last AI message gets center stage. Older
  // messages collapse into the dimmed history reel above.
  const lastAiIdx = [...messages].reverse().findIndex((m) => m.role === "ai");
  const activeIdx = lastAiIdx === -1 ? -1 : messages.length - 1 - lastAiIdx;
  const history = activeIdx === -1 ? messages : messages.slice(0, activeIdx);
  const activeAi = activeIdx === -1 ? null : messages[activeIdx];

  const safeIdx = Math.min(questionIndex + 1, totalQuestions);

  return (
    <main className="relative mx-auto flex min-h-[100dvh] max-w-4xl flex-col px-6 pt-10 pb-8 sm:px-10 lg:px-14">
      {/* Marquee row — act/scene + filmstrip progress */}
      <header className="mb-10 flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-3 font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.28em] text-[color:var(--stage-bone-dim)]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--stage-ember)]" />
          <span>On stage</span>
          <span className="text-[color:var(--stage-bone)] tabular-nums">
            Q{String(safeIdx).padStart(2, "0")}
          </span>
          <span aria-hidden>/</span>
          <span className="tabular-nums">
            {String(totalQuestions).padStart(2, "0")}
          </span>
        </div>

        {/* Filmstrip progress — segmented, not a fluid bar */}
        <div
          className="ml-auto flex flex-1 min-w-[10rem] items-center gap-1"
          role="progressbar"
          aria-valuenow={questionIndex}
          aria-valuemin={0}
          aria-valuemax={totalQuestions}
          aria-label="Interview progress"
        >
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const filled = i < questionIndex;
            const current = i === questionIndex;
            return (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full transition-all duration-500"
                style={{
                  background: filled
                    ? "var(--stage-ember)"
                    : current
                      ? "color-mix(in oklch, var(--stage-ember) 50%, transparent)"
                      : "color-mix(in oklch, var(--stage-bone-dim) 18%, transparent)",
                  boxShadow: filled
                    ? "0 0 8px color-mix(in oklch, var(--stage-ember) 60%, transparent)"
                    : "none",
                }}
              />
            );
          })}
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-6 rounded-sm border-l-2 border-l-[color:var(--stage-ember-deep)] bg-[color:color-mix(in_oklch,var(--stage-ember-deep)_12%,transparent)] px-4 py-3 font-[family-name:var(--font-mock-mono)] text-sm text-[color:var(--stage-bone)]"
        >
          {error}
        </p>
      )}

      {/* History reel — older exchanges, dimmed like script footnotes */}
      {history.length > 0 && (
        <div
          className="relative mb-10 max-h-[14rem] space-y-5 overflow-y-auto pr-2"
          aria-label="Past exchanges"
        >
          <div
            aria-hidden
            className="pointer-events-none sticky top-0 -mt-2 h-6"
            style={{
              background:
                "linear-gradient(180deg, var(--stage-ink-deep) 0%, transparent 100%)",
            }}
          />
          {history.map((m, i) => (
            <ScriptLine key={i} role={m.role} text={m.text} dimmed />
          ))}
        </div>
      )}

      {/* The active question — center stage, big italic Fraunces */}
      {activeAi && (
        <section
          aria-live="polite"
          aria-label="Current interview question"
          className="relative my-4 sm:my-8"
        >
          {/* Spotlight bloom behind the question */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-12 -inset-y-10 -z-10"
            style={{
              background:
                "radial-gradient(70% 70% at 50% 50%, color-mix(in oklch, var(--stage-ember) 22%, transparent) 0%, transparent 70%)",
            }}
          />

          <div className="flex items-baseline gap-3 font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.28em] text-[color:var(--stage-ember)]">
            <span>Interviewer</span>
            <span className="h-px flex-1 bg-[color:color-mix(in_oklch,var(--stage-ember)_30%,transparent)]" />
          </div>

          <p className="mt-5 max-w-3xl font-[family-name:var(--font-mock-display)] text-[1.85rem] font-medium italic leading-[1.18] tracking-[-0.015em] text-[color:var(--stage-bone)] sm:text-[2.4rem]">
            <DropCapText text={activeAi.text} />
          </p>
        </section>
      )}

      <div className="flex-1" />
      <div ref={endRef} />

      <AnswerComposer
        value={currentAnswer}
        onChange={setCurrentAnswer}
        onSubmit={onSubmit}
        submitting={submitting}
      />
    </main>
  );
}
