"use client";

import { useEffect, useState } from "react";

/**
 * Returns a stable `now` timestamp captured at mount, refreshed on an
 * interval. Replaces the broken pattern of
 *
 *   useSyncExternalStore(noop, () => Date.now(), () => 0)
 *
 * which produced React error #185 (Maximum update depth exceeded) in
 * production builds. `useSyncExternalStore` calls `getSnapshot` more than
 * once per render to verify stability; `Date.now()` returns a different
 * number each call, so the store always looks "changed", scheduling
 * another render → infinite loop.
 *
 * SSR returns 0 so server-rendered output is deterministic; the client
 * mounts with the current time and updates every `intervalMs` (default
 * 60s — enough for "X minutes ago" labels to advance).
 */
export function useStableNow(intervalMs: number = 60_000): number {
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
