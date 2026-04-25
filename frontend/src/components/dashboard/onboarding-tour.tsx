"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ArrowRight, Kanban, Mail, Sparkles, Upload, X } from "lucide-react";
import Link from "next/link";
import { useFocusTrap } from "@/hooks/use-focus-trap";

/**
 * OnboardingTour — first-run guided intro shown on /dashboard.
 *
 * Design choices:
 * - No portals, no anchors, no positioning library: a centered modal keeps
 *   copy and images aligned regardless of viewport or layout shifts.
 * - localStorage flag persists dismissal (`autoappli_tour_completed`).
 *   Clearing the flag via the browser dev tools re-runs the tour.
 * - Mounts only on the client: avoids SSR hydration flicker and keeps
 *   the initial paint clean.
 * - Escape key or "Skip tour" dismisses without marking completed — the
 *   tour re-appears next visit unless the user clicks "Finish".
 */

type Step = {
  icon: React.ElementType;
  title: string;
  body: string;
  cta?: { label: string; href: string };
};

const STEPS: Step[] = [
  {
    icon: Upload,
    title: "Upload your resume once",
    body: "Drop your PDF into the Resume Builder. We parse your skills, seniority, and experience so every tailored version starts from a solid base.",
    cta: { label: "Go to Resume Builder", href: "/resume" },
  },
  {
    icon: Kanban,
    title: "Save jobs to your Kanban board",
    body: "Every job gets a card with a fit score, notes, and one-click tailoring. Drag between Bookmarked, Applied, Interviewing, and Offer as things move.",
  },
  {
    icon: Sparkles,
    title: "Tailor + apply in 30 seconds",
    body: "From any card, click the sparkles icon to generate a tailored resume, or use Outreach to draft a cold message matched to the role and company.",
    cta: { label: "Try Outreach", href: "/outreach" },
  },
  {
    icon: Mail,
    title: "You're set",
    body: "Everything lives in one workspace — no spreadsheets, no 12 tabs. Come back daily; your pipeline stays in sync.",
  },
];

const STORAGE_KEY = "autoappli_tour_completed";

// SSR-safe sync of the tour-completed flag. Server renders nothing (snapshot
// `true` so the tour stays closed); client snapshot reads localStorage so
// new visitors see the tour immediately on hydration without going through
// a `setState` inside an effect.
function readTourCompleted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // private browsing — skip the tour
  }
}
const subscribeTourFlag = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const getTourFlagServerSnapshot = () => true;

export function OnboardingTour() {
  // `manuallyClosed` is the in-tab dismiss flag (covers both Skip and
  // Finish — Finish also persists). The tour is open iff:
  //   it's been hydrated AND the persisted flag is unset AND the user
  //   hasn't closed it this session.
  const tourCompleted = useSyncExternalStore(
    subscribeTourFlag,
    readTourCompleted,
    getTourFlagServerSnapshot,
  );
  const [manuallyClosed, setManuallyClosed] = useState(false);
  const open = !tourCompleted && !manuallyClosed;
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useFocusTrap(open, dialogRef);

  // Capture the element that had focus right before the tour opens, so we
  // can restore focus on close. Runs on every transition into the open
  // state; the noop branch when already-open keeps this effect's body
  // free of conditional setState (no rule violation, only ref writes).
  useEffect(() => {
    if (!open) return;
    if (openerRef.current === null && typeof document !== "undefined") {
      openerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  // Restore focus to the opener on close.
  useEffect(() => {
    if (open) return;
    const opener = openerRef.current;
    if (opener && typeof opener.focus === "function") {
      opener.focus();
    }
  }, [open]);

  const close = useCallback((markCompleted: boolean) => {
    if (markCompleted) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
        // Notify the external-store subscriber in this same tab so the
        // useSyncExternalStore snapshot re-reads the flag immediately.
        window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
      } catch {
        /* ignore */
      }
    }
    setManuallyClosed(true);
  }, []);

  // Keyboard affordances: Esc to dismiss, → to advance.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      else if (e.key === "ArrowRight") {
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
      } else if (e.key === "ArrowLeft") {
        setStep((s) => Math.max(s - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl overscroll-contain"
      >
        <button
          type="button"
          aria-label="Dismiss onboarding tour"
          onClick={() => close(false)}
          className="absolute top-3 right-3 rounded-md p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="p-6 md:p-8">
          <div className="mx-auto h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/30 flex items-center justify-center mb-5">
            <Icon className="h-7 w-7 text-blue-300" aria-hidden="true" />
          </div>

          <h2
            id="tour-title"
            className="text-xl md:text-2xl font-bold text-white tracking-tight text-center"
          >
            {current.title}
          </h2>
          <p
            id="tour-body"
            className="mt-3 text-sm text-zinc-400 leading-relaxed text-center"
          >
            {current.body}
          </p>

          {current.cta && (
            <Link
              href={current.cta.href}
              onClick={() => close(true)}
              className="mt-5 mx-auto w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              {current.cta.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}

          {/* Progress dots */}
          <div
            className="mt-6 flex items-center justify-center gap-1.5"
            role="group"
            aria-label="Tour progress"
          >
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1} of ${STEPS.length}`}
                aria-current={i === step ? "step" : undefined}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full [transition:width_150ms,background-color_150ms] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  i === step
                    ? "w-6 bg-blue-500"
                    : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => close(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(s - 1, 0))}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Back
                </button>
              )}
              {isLast ? (
                <button
                  type="button"
                  onClick={() => close(true)}
                  className="rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Finish
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
                  className="rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-blue-600/20 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Next
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
