/**
 * CallSheetStage — the "setup" view, framed as a backstage call sheet.
 *
 * Visual metaphor: a typewritten production document on a dimly lit
 * podium. Job description = the script. Role + question count = the
 * billing. Big curtain-up CTA at the bottom.
 *
 * Form primitives live in stage-form-fields.tsx to keep this file
 * focused on layout/composition.
 */

"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { SelectField, TextareaField } from "./stage-form-fields";
import { CallSheetHeader } from "./call-sheet-header";

interface CallSheetStageProps {
  jd: string;
  setJd: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  numQuestions: number;
  setNumQuestions: (v: number) => void;
  submitting: boolean;
  error: string | null;
  onStart: () => void;
  roleOptions: { value: string; label: string }[];
  numQOptions: number[];
}

export function CallSheetStage({
  jd,
  setJd,
  role,
  setRole,
  numQuestions,
  setNumQuestions,
  submitting,
  error,
  onStart,
  roleOptions,
  numQOptions,
}: CallSheetStageProps) {
  const jdId = useId();
  const roleId = useId();
  const numQId = useId();
  const [focused, setFocused] = useState<string | null>(null);

  return (
    <main className="relative mx-auto max-w-3xl px-6 py-16 sm:py-24 lg:px-12">
      <CallSheetHeader />

      {/* The call-sheet "card" — hand-built dimensional surface */}
      <section
        aria-labelledby="setup-heading"
        className="relative mt-12 rounded-sm border border-[color:var(--stage-rule)] bg-[color:color-mix(in_oklch,var(--stage-ink)_92%,transparent)] backdrop-blur-sm"
        style={{
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02)",
        }}
      >
        {/* Top tape — corner accent, ember gaff tape */}
        <div
          aria-hidden
          className="absolute -top-3 left-8 h-6 w-24 rotate-[-3deg] rounded-[2px]"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklch, var(--stage-ember) 60%, transparent), color-mix(in oklch, var(--stage-ember-deep) 50%, transparent))",
            boxShadow: "0 4px 10px -2px rgba(0,0,0,0.4)",
          }}
        />

        <header
          id="setup-heading"
          className="border-b border-[color:var(--stage-rule)] px-6 py-4 sm:px-8"
        >
          <div className="flex items-baseline justify-between font-[family-name:var(--font-mock-mono)] text-[0.68rem] uppercase tracking-[0.24em] text-[color:var(--stage-bone-dim)]">
            <span>Production · Mock Interview</span>
            <span className="tabular-nums">Brief</span>
          </div>
        </header>

        <div className="space-y-7 px-6 py-7 sm:px-8 sm:py-8">
          {error && (
            <p
              role="alert"
              className="rounded-sm border-l-2 border-l-[color:var(--stage-ember-deep)] bg-[color:color-mix(in_oklch,var(--stage-ember-deep)_12%,transparent)] px-4 py-3 font-[family-name:var(--font-mock-mono)] text-sm text-[color:var(--stage-bone)]"
            >
              {error}
            </p>
          )}

          {/* Job description — the script */}
          <div>
            <label
              htmlFor={jdId}
              className="mb-2 flex items-center justify-between font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.24em] text-[color:var(--stage-bone-dim)]"
            >
              <span>01 — The script</span>
              <span className="tabular-nums">{jd.length} chars</span>
            </label>
            <TextareaField
              id={jdId}
              value={jd}
              onChange={setJd}
              rows={7}
              placeholder="Paste the job description — responsibilities, requirements, the lot."
              focused={focused === "jd"}
              onFocus={() => setFocused("jd")}
              onBlur={() => setFocused(null)}
            />
          </div>

          {/* Role + Count — split billing */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <SelectField
              id={roleId}
              label="02 — Casting"
              value={role}
              onChange={setRole}
              options={roleOptions}
              focused={focused === "role"}
              onFocus={() => setFocused("role")}
              onBlur={() => setFocused(null)}
            />
            <SelectField
              id={numQId}
              label="03 — Run time"
              value={String(numQuestions)}
              onChange={(v) => setNumQuestions(Number(v))}
              options={numQOptions.map((n) => ({
                value: String(n),
                label: `${n} questions`,
              }))}
              focused={focused === "numq"}
              onFocus={() => setFocused("numq")}
              onBlur={() => setFocused(null)}
            />
          </div>

          {/* Curtain-up CTA */}
          <button
            data-testid="mock-start"
            onClick={onStart}
            disabled={submitting || jd.trim().length < 10}
            aria-busy={submitting}
            className="group/cta relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-sm border border-[color:color-mix(in_oklch,var(--stage-ember)_50%,transparent)] py-4 font-[family-name:var(--font-mock-mono)] text-sm uppercase tracking-[0.22em] text-[color:var(--stage-ink-deep)] transition-all hover:tracking-[0.28em] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background:
                "linear-gradient(180deg, var(--stage-ember) 0%, var(--stage-ember-deep) 100%)",
              boxShadow:
                "0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 24px -6px color-mix(in oklch, var(--stage-ember) 50%, transparent)",
            }}
          >
            <span className="relative z-10">
              {submitting ? "Curtain rising…" : "Raise the curtain"}
            </span>
            {!submitting && (
              <ChevronRight
                aria-hidden
                className="relative z-10 h-4 w-4 transition-transform group-hover/cta:translate-x-1"
              />
            )}
          </button>

          <p className="text-center font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.2em] text-[color:color-mix(in_oklch,var(--stage-bone-dim)_70%,transparent)]">
            Practice space · Nothing is submitted to employers
          </p>
        </div>
      </section>
    </main>
  );
}
