"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Sparkles, X } from "lucide-react";
import { disableDemoMode, isDemoMode } from "@/lib/demo-mode";

// SSR-safe demo-flag sync: server snapshot is always `false` (no flash for
// real users), client snapshot reads localStorage. The `storage` event
// covers cross-tab toggles; same-tab toggles still require a refresh
// (matches the previous useEffect-on-mount behaviour exactly).
const subscribeDemoFlag = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const getDemoFlagServerSnapshot = () => false;

/**
 * DemoModeBanner — top-of-dashboard nudge that appears when the visitor
 * is exploring with seeded demo data (see /lib/demo-mode.ts).
 *
 * - Only renders after the first client-side hydration so SSR doesn't
 *   flash the banner to authenticated users.
 * - "Sign up" clears the demo flag first so the auth flow lands the user
 *   on their real (empty) board, not the demo data.
 */
export function DemoModeBanner() {
  const visible = useSyncExternalStore(
    subscribeDemoFlag,
    isDemoMode,
    getDemoFlagServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 rounded-lg border border-blue-500/40 bg-gradient-to-r from-blue-600/10 via-blue-600/5 to-violet-600/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-blue-300" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-50">
            You&apos;re exploring the demo
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            Every change is saved in this browser tab only. Sign up free to
            keep your jobs, resumes, and outreach.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/signup"
          onClick={() => disableDemoMode()}
          className="rounded-md bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Sign up free
        </Link>
        <Link
          href="/login"
          onClick={() => disableDemoMode()}
          className="rounded-md border border-zinc-700 hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Sign in
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss demo mode banner"
          className="rounded-md p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
