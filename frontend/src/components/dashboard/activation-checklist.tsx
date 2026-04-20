"use client";
/**
 * Sprint 7 — activation checklist.
 *
 * Replaces the passive 4-slide tour as the primary onboarding surface.
 * Reads three real signals from the user's account:
 *
 *   1. Has uploaded a resume         → GET /resumes
 *   2. Has saved at least one job    → GET /jobs (via useJobs)
 *   3. Has generated a tailored doc  → GET /resumes/generated
 *
 * Each step shows a checkmark when satisfied. The whole card auto-hides
 * once all three are done OR once the user explicitly dismisses it
 * (`autoappli_activation_dismissed` localStorage flag).
 *
 * Why a checklist (not a tour):
 *   - Tours teach but don't measure. Checklists measure AND teach.
 *   - Sticks around until the user actually does the thing — meaning
 *     they always have a clear "what's next" when they come back.
 *   - Doubles as a progress meter — users like seeing 1/3, 2/3, 3/3.
 *
 * Self-contained: takes no props. Mount it anywhere on /dashboard.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useJobs } from "@/hooks/use-jobs";
import type { Resume, SavedTailoredDocument } from "@/types";

const DISMISS_KEY = "autoappli_activation_dismissed";

interface ChecklistStep {
  id: "resume" | "job" | "tailor";
  title: string;
  body: string;
  done: boolean;
  cta: { label: string; href: string };
}

export function ActivationChecklist() {
  const { jobs, isLoading: jobsLoading } = useJobs();

  const { data: resumes, isLoading: resumesLoading } = useSWR<Resume[]>(
    "/resumes",
    () => apiGet<Resume[]>("/resumes"),
    { revalidateOnFocus: false },
  );

  const { data: tailored, isLoading: tailoredLoading } = useSWR<
    SavedTailoredDocument[]
  >(
    "/resumes/generated",
    () => apiGet<SavedTailoredDocument[]>("/resumes/generated"),
    { revalidateOnFocus: false },
  );

  // Dismiss state — persisted, with a one-render flicker guard so SSR
  // hydration doesn't mismatch (see the "mounted" gate below).
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* storage disabled — show the checklist */
    }
  }, []);

  const steps: ChecklistStep[] = useMemo(
    () => [
      {
        id: "resume",
        title: "Upload your resume",
        body: "Drop in a PDF — we parse your skills + experience so every tailored version starts from a real base.",
        done: (resumes?.length ?? 0) > 0,
        cta: { label: "Upload resume", href: "/resume" },
      },
      {
        id: "job",
        title: "Save your first job",
        body: "Paste a posting URL into your board. The match score updates automatically.",
        done: jobs.length > 0,
        cta: { label: "Browse Discover", href: "/discover" },
      },
      {
        id: "tailor",
        title: "Generate a tailored resume",
        body: "Pick a job, click Generate. You'll see a fit score and a downloadable PDF in seconds.",
        done: (tailored?.length ?? 0) > 0,
        cta: { label: "Open Resume Builder", href: "/resume" },
      },
    ],
    [jobs.length, resumes?.length, tailored?.length],
  );

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  // Hide while we don't yet know the answer — prevents a flash of "0/3"
  // for returning users who actually have everything set up.
  const stillLoading = resumesLoading || jobsLoading || tailoredLoading;

  if (!mounted) return null;
  if (dismissed) return null;
  if (allDone) return null;
  if (stillLoading) return null;

  // Find the first incomplete step — that's the one we visually highlight.
  const nextStep = steps.find((s) => !s.done);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <section
      aria-label="Activation checklist"
      className="mb-6 overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-zinc-950 to-zinc-950"
    >
      <header className="flex items-center justify-between gap-3 border-b border-blue-500/20 bg-blue-950/30 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Get set up in 3 steps
            </h2>
            <p className="text-xs text-zinc-400">
              {completedCount}/{steps.length} complete
              {nextStep ? ` · next: ${nextStep.title.toLowerCase()}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
            title="Dismiss — won't show again"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Progress bar — small visual cue under the header. */}
      <div className="h-1 w-full bg-zinc-900">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {!collapsed && (
        <ol className="divide-y divide-zinc-800">
          {steps.map((step, i) => (
            <ChecklistRow
              key={step.id}
              step={step}
              index={i}
              isNext={step === nextStep}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function ChecklistRow({
  step,
  index,
  isNext,
}: {
  step: ChecklistStep;
  index: number;
  isNext: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 px-4 py-3.5 transition-colors",
        isNext && "bg-blue-500/5",
      )}
    >
      <div className="mt-0.5 shrink-0">
        {step.done ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />
        ) : (
          <Circle
            className={cn(
              "h-5 w-5",
              isNext ? "text-blue-400" : "text-zinc-600",
            )}
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            step.done ? "text-zinc-500 line-through" : "text-zinc-100",
          )}
        >
          {index + 1}. {step.title}
        </p>
        {!step.done && (
          <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">
            {step.body}
          </p>
        )}
      </div>
      {!step.done && (
        <Link
          href={step.cta.href}
          className={cn(
            buttonVariants({ variant: isNext ? "default" : "outline", size: "sm" }),
            "no-underline shrink-0",
            isNext
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "border-zinc-700 text-zinc-200",
          )}
        >
          {step.id === "resume" ? (
            <Upload className="h-3.5 w-3.5 mr-1.5" />
          ) : null}
          {step.cta.label}
        </Link>
      )}
    </li>
  );
}
