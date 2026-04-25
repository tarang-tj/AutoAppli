"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowRight,
  Check,
  FileText,
  Kanban,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  enableDemoMode,
  isDemoMode,
} from "@/lib/demo-mode";
import {
  getOnboardingServerSnapshot,
  getOnboardingSnapshot,
  markSeen,
  subscribeOnboarding,
  writeStep,
  type OnboardingStep,
} from "@/lib/onboarding/onboarding-state";

/**
 * OnboardingTour — first-run, 4-step interactive tour shown on /dashboard.
 *
 * Persistence:
 *   - Step + seen flags live in localStorage (see `onboarding-state.ts`).
 *   - Steps 2 and 3 hand off to /resume and /outreach. Step is bumped
 *     BEFORE navigation so when the user returns, the tour resumes at
 *     the next step.
 *   - Skip / Esc / backdrop / X all set `seen = true` (treat as
 *     "I get it, leave me alone").
 *
 * A11y:
 *   - role="dialog" + aria-modal + aria-labelledby + useFocusTrap.
 *   - Decorative icons aria-hidden.
 *   - All buttons have aria-label or visible text.
 *   - Esc returns focus to the opener via the openerRef pattern.
 */

const STEPS: ReadonlyArray<{
  num: 1 | 2 | 3 | 4;
  icon: React.ElementType;
  heading: string;
  body: string;
}> = [
  {
    num: 1,
    icon: Kanban,
    heading: "Step 1: Save a role to your kanban",
    body: "AutoAppli runs on saved jobs. The faster you fill the board, the better every other feature gets.",
  },
  {
    num: 2,
    icon: FileText,
    heading: "Step 2: Tailor a resume",
    body: "Paste a JD. Get a resume tuned to it in 30 seconds. AutoAppli edits, you review.",
  },
  {
    num: 3,
    icon: Send,
    heading: "Step 3: Draft outreach that doesn't sound like a tool",
    body: "AutoAppli writes recruiter messages that sound like a student, not a sales email. You edit, you send.",
  },
  {
    num: 4,
    icon: Sparkles,
    heading: "Step 4: You hit apply, on the company's page",
    body: "AutoAppli doesn't auto-submit on purpose. The kanban tracks where each role is — you move cards as you apply, interview, get offers.",
  },
];

export function OnboardingTour() {
  const state = useSyncExternalStore(
    subscribeOnboarding,
    getOnboardingSnapshot,
    getOnboardingServerSnapshot,
  );

  // In-tab dismiss flag. Lets the user close the tour without flicker
  // before the persisted `seen` flag round-trips through localStorage.
  const [closedThisSession, setClosedThisSession] = useState(false);

  const open = !state.seen && !closedThisSession;
  const currentStep: OnboardingStep = state.step === "done" ? 4 : state.step;
  const stepIndex = currentStep - 1;
  const current = STEPS[stepIndex] ?? STEPS[0];
  const Icon = current.icon;

  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Per-step UI state. `sampleLoaded` seeds from the demo flag on first
  // render so a returning user who already enabled demo mode sees the
  // success state straight away. Lazy initializer keeps the localStorage
  // read out of every re-render and avoids a setState-in-effect.
  const [sampleLoaded, setSampleLoaded] = useState<boolean>(() => isDemoMode());

  useFocusTrap(open, dialogRef);

  // Capture the previously focused element on open so we can restore on
  // close. Same pattern as ShortcutsHelp.
  useEffect(() => {
    if (!open) return;
    if (openerRef.current === null && typeof document !== "undefined") {
      openerRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  // Restore focus on close.
  useEffect(() => {
    if (open) return;
    const opener = openerRef.current;
    if (opener && typeof opener.focus === "function") opener.focus();
  }, [open]);

  // Close = mark seen permanently. Esc / backdrop / Skip / X all funnel
  // through here. The "Got it" CTA on step 4 also calls this.
  const closeAsSeen = useCallback(() => {
    markSeen();
    setClosedThisSession(true);
  }, []);

  // Esc dismisses — same affordance as the rest of the app's modals.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeAsSeen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeAsSeen]);

  const goToStep = useCallback((next: 1 | 2 | 3 | 4) => {
    writeStep(next);
  }, []);

  const handleLoadSampleRoles = useCallback(() => {
    enableDemoMode();
    setSampleLoaded(true);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-body"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
      onMouseDown={(e) => {
        // Backdrop click = skip (matches Esc behaviour).
        if (e.target === e.currentTarget) closeAsSeen();
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl overscroll-contain"
      >
        <button
          type="button"
          aria-label="Close onboarding tour"
          onClick={closeAsSeen}
          className="absolute top-3 right-3 rounded-md p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="p-6 md:p-7">
          {/* Step indicator dots — at the top, current one wider/blue. */}
          <div
            className="mx-auto mb-5 flex items-center justify-center gap-1.5"
            role="group"
            aria-label={`Step ${currentStep} of ${STEPS.length}`}
          >
            {STEPS.map((s) => (
              <span
                key={s.num}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-[width,background-color] motion-reduce:transition-none ${
                  s.num === currentStep
                    ? "w-6 bg-blue-500"
                    : s.num < currentStep
                    ? "w-1.5 bg-blue-500/50"
                    : "w-1.5 bg-zinc-700"
                }`}
              />
            ))}
          </div>

          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/30 flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-blue-300" aria-hidden="true" />
          </div>

          <h2
            id="onboarding-title"
            className="text-lg md:text-xl font-bold text-white tracking-tight text-center"
          >
            {current.heading}
          </h2>
          <p
            id="onboarding-body"
            className="mt-2 text-sm text-zinc-400 leading-relaxed text-center"
          >
            {current.body}
          </p>

          {/* Per-step interactive zone */}
          <div className="mt-5">
            {currentStep === 1 && (
              <Step1SampleRoles
                loaded={sampleLoaded}
                onLoad={handleLoadSampleRoles}
              />
            )}
            {currentStep === 2 && (
              <HandoffLink
                href="/resume"
                label="Open Resume Builder"
                onBeforeNavigate={() => goToStep(3)}
              />
            )}
            {currentStep === 3 && (
              <HandoffLink
                href="/outreach"
                label="Open Outreach"
                onBeforeNavigate={() => goToStep(4)}
              />
            )}
            {currentStep === 4 && (
              <button
                type="button"
                onClick={closeAsSeen}
                aria-label="Finish onboarding tour and show the board"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                Got it — show me the board
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Footer: progress label + nav */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 tabular-nums">
              Step {currentStep} of {STEPS.length}
            </span>
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  aria-label="Go to previous step"
                  onClick={() => goToStep((currentStep - 1) as 1 | 2 | 3)}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Back
                </button>
              )}
              {currentStep === 1 && (
                <button
                  type="button"
                  aria-label="Go to next step"
                  onClick={() => goToStep(2)}
                  className="rounded-md bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg shadow-blue-600/20 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  Next
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={closeAsSeen}
              aria-label="Skip the onboarding tour"
              className="text-xs text-zinc-500 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
            >
              Skip tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 interactive: load sample roles via demo-mode ──────────────

function Step1SampleRoles({
  loaded,
  onLoad,
}: {
  loaded: boolean;
  onLoad: () => void;
}) {
  if (loaded) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200"
      >
        <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
        Sample roles loaded — refresh to see them on the board
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onLoad}
      aria-label="Load sample roles into your kanban board"
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-200 hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      Save sample roles
    </button>
  );
}

// ─── Hand-off link: bumps step BEFORE navigation ──────────────────────

function HandoffLink({
  href,
  label,
  onBeforeNavigate,
}: {
  href: string;
  label: string;
  onBeforeNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onBeforeNavigate}
      aria-label={label}
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-200 hover:bg-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 no-underline"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}
