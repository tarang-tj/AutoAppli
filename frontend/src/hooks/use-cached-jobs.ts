"use client";
/**
 * SWR hooks around the Supabase-direct `cached_jobs` reads.
 *
 * The firehose table is readable by anon + authenticated with identical RLS
 * (no user_id filter), so these hooks work on both the signed-out landing
 * and inside the signed-in dashboard without branching on session state.
 */
import useSWR, { type SWRConfiguration } from "swr";
import {
  fetchCachedJobs,
  fetchCachedJobCompanies,
  fetchTopCachedJobSkills,
  type CachedJobsQuery,
  type CachedJobsResult,
} from "@/lib/supabase/cached-jobs";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const SHARED_SWR: SWRConfiguration = {
  // The firehose doesn't move fast enough to warrant on-focus revalidation.
  revalidateOnFocus: false,
  // Keep a short dedupe window so rapid filter tweaks share in-flight reqs.
  dedupingInterval: 1500,
};

/** Build a stable SWR key from a CachedJobsQuery — order-independent. */
function queryKey(q: CachedJobsQuery): string {
  const parts = [
    `search=${q.search ?? ""}`,
    `skills=${(q.skills ?? []).slice().sort().join("|")}`,
    `remote=${q.remoteType ?? ""}`,
    `company=${q.company ?? ""}`,
    `days=${q.postedWithinDays ?? 0}`,
    `sort=${q.sort ?? "recent"}`,
    `limit=${q.limit ?? 24}`,
    `offset=${q.offset ?? 0}`,
    `inactive=${q.includeInactive ? 1 : 0}`,
  ];
  return `cached_jobs::${parts.join("&")}`;
}

/**
 * Fetch a paginated slice of the firehose. Returns an empty result if
 * Supabase isn't configured so the Discover page can still render a
 * "configure Supabase to see live jobs" state without crashing.
 */
export function useCachedJobs(query: CachedJobsQuery) {
  const configured = isSupabaseConfigured();
  const key = configured ? queryKey(query) : null;
  const { data, error, isLoading, mutate } = useSWR<CachedJobsResult>(
    key,
    () => fetchCachedJobs(query),
    SHARED_SWR,
  );

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    isLoading: configured && isLoading,
    error,
    mutate,
    configured,
  };
}

/** Top N skills across the active firehose, sorted by frequency. */
export function useTopCachedJobSkills(topN: number = 30) {
  const configured = isSupabaseConfigured();
  const { data, error, isLoading } = useSWR(
    configured ? `cached_jobs::top_skills::${topN}` : null,
    () => fetchTopCachedJobSkills(topN),
    SHARED_SWR,
  );
  return {
    skills: data ?? [],
    isLoading: configured && isLoading,
    error,
  };
}

/** Distinct active companies (capped at 200) for the filter dropdown. */
export function useCachedJobCompanies() {
  const configured = isSupabaseConfigured();
  const { data, error, isLoading } = useSWR(
    configured ? "cached_jobs::companies" : null,
    () => fetchCachedJobCompanies(),
    SHARED_SWR,
  );
  return {
    companies: data ?? [],
    isLoading: configured && isLoading,
    error,
  };
}
