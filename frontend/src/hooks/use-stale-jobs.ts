"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { apiGet } from "@/lib/api";
import type { Job } from "@/types";

/**
 * LocalStorage key holding the user's chosen ghost threshold (days).
 * Exported so the StaleJobsNudge settings slider can read/write it
 * directly without going through the hook.
 */
export const STALE_THRESHOLD_KEY = "stale_threshold_v1";
export const STALE_THRESHOLD_DEFAULT = 30;

/**
 * LocalStorage key whose value is the latest stale-count we showed the
 * user a banner for. When the count changes we resurface the banner.
 */
export const STALE_DISMISSED_AT_KEY = "stale_banner_dismissed_at_v1";

type StaleResponse = {
  stale_jobs: Job[];
  days: number;
};

function readThresholdFromStorage(): number {
  if (typeof window === "undefined") return STALE_THRESHOLD_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STALE_THRESHOLD_KEY);
    if (!raw) return STALE_THRESHOLD_DEFAULT;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 7 || parsed > 180) {
      return STALE_THRESHOLD_DEFAULT;
    }
    return parsed;
  } catch {
    return STALE_THRESHOLD_DEFAULT;
  }
}

/**
 * SWR hook around `GET /automation/stale?days=N`. The threshold is
 * read from localStorage so user overrides survive navigation.
 *
 * Callers can override by passing an explicit `days` argument, which
 * wins over the stored value and is also persisted back so the banner
 * slider keeps the two in sync.
 */
export function useStaleJobs(days?: number) {
  const [threshold, setThreshold] = useState<number>(() =>
    typeof days === "number" ? days : readThresholdFromStorage()
  );

  // Keep local state in sync with an explicit `days` argument. Skipped
  // on the initial render because useState(initializer) already handled
  // that case.
  useEffect(() => {
    if (typeof days === "number" && days !== threshold) {
      setThreshold(days);
    }
    // Intentionally depending only on `days` — we want changes to the
    // explicit prop to propagate, not changes we make via setThreshold.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const path = `/automation/stale?days=${threshold}`;
  const { data, error, isLoading, mutate } = useSWR<StaleResponse>(
    path,
    () => apiGet<StaleResponse>(path),
    { revalidateOnFocus: false }
  );

  const updateThreshold = (next: number) => {
    const clamped = Math.max(7, Math.min(180, Math.round(next)));
    setThreshold(clamped);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STALE_THRESHOLD_KEY, String(clamped));
      } catch {
        /* ignore — quota, privacy mode, etc. */
      }
    }
  };

  const staleJobs = (data?.stale_jobs ?? []) as Job[];

  return {
    staleJobs,
    threshold,
    updateThreshold,
    isLoading,
    error,
    mutate,
  };
}
