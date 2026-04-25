/**
 * Onboarding tour state — persisted across navigations.
 *
 * Two localStorage keys:
 *   - `autoappli_onboarding_seen` ("1" once finished or skipped)
 *   - `autoappli_onboarding_step` ("1" | "2" | "3" | "4")
 *
 * Why two keys: step 2 and step 3 hand off to /resume and /outreach
 * respectively. The component bumps the step BEFORE navigating, so when
 * the user comes back to /dashboard the tour resumes at the next step.
 *
 * Returns `step: "done"` whenever `seen` is true, regardless of what the
 * step key holds. Callers don't need to special-case that — they just
 * check `step === "done"` to decide whether to render anything.
 *
 * Use the `subscribe` / `getSnapshot` exports with `useSyncExternalStore`
 * for SSR-safe React subscription (matches the pattern in
 * activation-checklist.tsx and demo-mode-banner.tsx).
 */

export type OnboardingStep = 1 | 2 | 3 | 4 | "done";

export interface OnboardingState {
  step: OnboardingStep;
  seen: boolean;
}

export const SEEN_KEY = "autoappli_onboarding_seen";
export const STEP_KEY = "autoappli_onboarding_step";

const DEFAULT_STATE: OnboardingState = { step: 1, seen: false };

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
    // Same-tab StorageEvent so useSyncExternalStore subscribers re-snapshot
    // immediately. The native `storage` event only fires across tabs.
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    /* private browsing / quota — silently ignore */
  }
}

function lsRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    /* ignore */
  }
}

function parseStep(raw: string | null): OnboardingStep {
  switch (raw) {
    case "1":
      return 1;
    case "2":
      return 2;
    case "3":
      return 3;
    case "4":
      return 4;
    default:
      return 1;
  }
}

export function readOnboardingState(): OnboardingState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const seen = lsGet(SEEN_KEY) === "1";
  if (seen) return { step: "done", seen: true };
  return { step: parseStep(lsGet(STEP_KEY)), seen: false };
}

export function writeStep(step: OnboardingStep): void {
  if (step === "done") {
    markSeen();
    return;
  }
  lsSet(STEP_KEY, String(step));
}

export function markSeen(): void {
  lsSet(SEEN_KEY, "1");
}

/**
 * Dev-only: clear both keys so the tour fires again on next dashboard
 * mount. Not wired to any UI — call from devtools console while iterating.
 */
export function resetOnboarding(): void {
  lsRemove(SEEN_KEY);
  lsRemove(STEP_KEY);
}

// ─── External-store subscription helpers ──────────────────────────────
// Server snapshot returns the "done" sentinel so SSR never renders the
// tour. Client snapshot reads localStorage on every notification.

const SERVER_SNAPSHOT: OnboardingState = { step: "done", seen: true };

export function subscribeOnboarding(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === SEEN_KEY || e.key === STEP_KEY || e.key === null) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function getOnboardingSnapshot(): OnboardingState {
  return readOnboardingState();
}

export function getOnboardingServerSnapshot(): OnboardingState {
  return SERVER_SNAPSHOT;
}
