"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { extractKeywords, findMissingKeywords } from "@/lib/tools/keyword-extract";

/**
 * Client island for the keyword extractor.
 *
 * Two text areas:
 *   - JD (required) — drives the main chip list.
 *   - Resume (optional) — when present, we surface which JD keywords are
 *     missing from the candidate's resume.
 *
 * Extraction runs on every keystroke via useDeferredValue, which lets
 * React keep typing snappy without us managing a debounce timer.
 */
export default function KeywordExtractorClient() {
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const deferredJd = useDeferredValue(jd);
  const deferredResume = useDeferredValue(resume);

  const keywords = useMemo(() => extractKeywords(deferredJd), [deferredJd]);
  const missing = useMemo(
    () => findMissingKeywords(keywords, deferredResume),
    [keywords, deferredResume],
  );

  const showResults = jd.trim().length > 0 && keywords.length > 0;
  const hasResume = resume.trim().length > 0;

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <div>
        <label
          htmlFor="jd-input"
          className="block text-sm font-medium text-zinc-300 mb-2"
        >
          Job description
        </label>
        <textarea
          id="jd-input"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the JD here…"
          rows={12}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      <div>
        <label
          htmlFor="resume-input"
          className="block text-sm font-medium text-zinc-300 mb-2"
        >
          Your resume{" "}
          <span className="text-zinc-500 font-normal">(optional)</span>
        </label>
        <textarea
          id="resume-input"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste resume text to see which JD keywords are missing…"
          rows={12}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      <div className="md:col-span-2">
        {showResults ? (
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-base font-semibold text-zinc-100">
                Top keywords
              </h2>
              <span className="text-xs text-zinc-500">
                {keywords.length} term{keywords.length === 1 ? "" : "s"} —
                weighted by frequency and position
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {keywords.map((k) => {
                const isMissing = missing.some((m) => m.term === k.term);
                const tone = isMissing
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                  : "border-zinc-700 bg-zinc-800/60 text-zinc-200";
                return (
                  <span
                    key={k.term}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${tone}`}
                  >
                    <span>{k.term}</span>
                    <span className="text-xs text-zinc-400 tabular-nums">
                      {k.frequency}
                    </span>
                  </span>
                );
              })}
            </div>

            {hasResume && (
              <div className="mt-6 border-t border-zinc-800 pt-5">
                <h3 className="text-sm font-semibold text-zinc-100">
                  Skills you might be missing
                </h3>
                {missing.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-400">
                    Nothing stood out — your resume already mentions every
                    top JD keyword. (That doesn’t mean each one is in
                    context. Consider whether they’re actually substantiated.)
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-zinc-400">
                      These JD keywords don’t appear in your resume text.
                      Decide whether each is a real gap, or just a missing
                      synonym you can add to a bullet.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {missing.map((m) => (
                        <span
                          key={m.term}
                          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-200"
                        >
                          {m.term}
                          <span className="text-xs text-amber-300/80 tabular-nums">
                            {m.frequency}
                          </span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center">
            <p className="text-sm text-zinc-500">
              Paste a job description above to see the top keywords.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
