/**
 * Demo-mode toggle for production builds.
 *
 * Goal: let an unauthenticated visitor click "Try demo" on the marketing
 * landing page and explore the full app pre-populated with demo data,
 * even when Supabase is configured (i.e. real production deployments).
 *
 * Implementation: a single localStorage flag, read by `isDemoMode()` and
 * checked at the top of every api.ts entry point. When true we route to
 * the in-memory demo handlers (handleDemoGet, etc.) and never touch
 * Supabase. The flag is cleared on signup/login so first authenticated
 * use always sees the user's real data.
 *
 * SSR safety: the flag lives in localStorage, so server-side calls from
 * Next.js route handlers always get `false`. That's intentional —
 * server-side calls always operate on real auth.
 */

const STORAGE_KEY = "autoappli_demo_mode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDemoMode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private browsing / quota — silently ignore */
  }
}

export function disableDemoMode(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
