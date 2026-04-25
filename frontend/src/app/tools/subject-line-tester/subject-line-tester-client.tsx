"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { scoreSubjectLine } from "@/lib/tools/subject-line-score";

/**
 * Client island for the subject-line tester.
 *
 * Real-time scoring — useDeferredValue keeps typing snappy by letting
 * React batch the score update behind the input render. No debounce
 * timer needed; React's scheduler handles it.
 */
export default function SubjectLineTesterClient() {
  const [input, setInput] = useState("");
  const deferred = useDeferredValue(input);
  const result = useMemo(() => scoreSubjectLine(deferred), [deferred]);
  const showResult = input.trim().length > 0;

  const categoryStyles: Record<typeof result.category, string> = {
    weak: "bg-red-500/15 border-red-500/40 text-red-300",
    ok: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    strong: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  };

  const scoreColor: Record<typeof result.category, string> = {
    weak: "text-red-300",
    ok: "text-amber-300",
    strong: "text-emerald-300",
  };

  return (
    <div className="mt-8">
      <label
        htmlFor="subject-line-input"
        className="block text-sm font-medium text-zinc-300 mb-2"
      >
        Subject line
      </label>
      <input
        id="subject-line-input"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. CMU junior — your 2024 talk on incident response"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        autoComplete="off"
        aria-describedby="subject-line-help"
      />
      <p
        id="subject-line-help"
        className="mt-2 text-xs text-zinc-500"
      >
        Nothing is sent. Scoring runs in your browser.
      </p>

      {showResult && (
        <div
          className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-baseline gap-4">
            <div
              className={`text-5xl font-semibold tabular-nums ${scoreColor[result.category]}`}
            >
              {result.score}
              <span className="text-2xl text-zinc-500">/10</span>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${categoryStyles[result.category]}`}
            >
              {result.category}
            </span>
          </div>

          {result.signals.length > 0 && (
            <ul className="mt-5 space-y-2">
              {result.signals.map((s, i) => {
                const isWarning =
                  /short|long|template|yelling|shouting|fake|muted/i.test(s);
                const Icon = isWarning ? AlertTriangle : CheckCircle2;
                const iconClass = isWarning
                  ? "text-amber-400"
                  : "text-emerald-400";
                return (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-zinc-300"
                  >
                    <Icon
                      className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconClass}`}
                      aria-hidden="true"
                    />
                    <span className="leading-relaxed">{s}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {result.suggestions && result.suggestions.length > 0 && (
            <div className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-200">
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                Try one of these
              </div>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
