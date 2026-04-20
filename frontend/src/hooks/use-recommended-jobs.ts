"use client";
/**
 * Sprint 6 — Recommendations rail data hook.
 *
 * Composes three existing data sources and ranks the result client-side:
 *   /resumes         → find the primary resume's parsed_text
 *   /profile         → read remote_preference
 *   cached_jobs      → wide slice (200 active, recent) via useCachedJobs
 *
 * `rankCachedJobs` runs synchronously on the combined result, so there's no
 * new network call beyond what the Discover grid already makes (we re-use a
 * distinct SWR key with limit=200 instead of the grid's 24).
 *
 * Status flags:
 *   hasResume      — user has uploaded at least one resume with parsed text.
 *   hasJobs        — the firehose returned at least one row.
 *   configured     — Supabase is configured in this environment.
 *   isLoading      — any of the three upstream fetches is still in flight.
 *   ready          — we have everything we need to render recommendations.
 */
import { useMemo } from "react";
import useSWR from "swr";
import { apiGet } from "@/lib/api";
import { useCachedJobs } from "@/hooks/use-cached-jobs";
import {
  rankCachedJobs,
  type RecommendedJob,
  type RemotePreference,
} from "@/lib/recommend";
import type { Resume, UserProfile } from "@/types";

/** Pool size we pull from the firehose for ranking. 200 is a deliberate cap:
 *  large enough that the top 12 are genuinely the best available, small
 *  enough that client-side scoring stays under 50ms on a cold laptop. */
const RECOMMEND_POOL_SIZE = 200;

/** How many top-ranked jobs the rail ultimately shows. */
const RAIL_LIMIT = 12;

export interface UseRecommendedJobsResult {
  /** Top-ranked jobs with score + reasons. Empty until ready. */
  recommendations: RecommendedJob[];
  hasResume: boolean;
  hasJobs: boolean;
  configured: boolean;
  isLoading: boolean;
  ready: boolean;
  error: unknown;
}

export function useRecommendedJobs(): UseRecommendedJobsResult {
  // 1. Resumes — same pattern as use-match-scores.ts.
  const {
    data: resumes,
    isLoading: resumesLoading,
    error: resumesError,
  } = useSWR<Resume[]>(
    "/resumes",
    () => apiGet<Resume[]>("/resumes"),
    { revalidateOnFocus: false },
  );
  const primaryResume = resumes?.find((r) => r.is_primary) ?? resumes?.[0];
  const resumeText = primaryResume?.parsed_text ?? "";

  // 2. Profile — pulled separately so a missing remote_preference degrades
  //    gracefully (score without the remote bonus) instead of failing the rail.
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useSWR<UserProfile>(
    "/profile",
    () => apiGet<UserProfile>("/profile"),
    { revalidateOnFocus: false },
  );
  const remotePreference: RemotePreference | null = normalizeRemotePref(
    profile?.remote_preference,
  );

  // 3. Wide firehose slice.
  const { rows, isLoading: jobsLoading, configured, error: jobsError } =
    useCachedJobs({
      sort: "recent",
      limit: RECOMMEND_POOL_SIZE,
      offset: 0,
      includeInactive: false,
    });

  const recommendations = useMemo<RecommendedJob[]>(() => {
    if (!resumeText || rows.length === 0) return [];
    return rankCachedJobs({
      resumeText,
      remotePreference,
      jobs: rows,
      limit: RAIL_LIMIT,
    });
  }, [resumeText, remotePreference, rows]);

  const hasResume = Boolean(resumeText);
  const hasJobs = rows.length > 0;
  const isLoading = resumesLoading || profileLoading || jobsLoading;
  const ready = hasResume && hasJobs && !isLoading;

  return {
    recommendations,
    hasResume,
    hasJobs,
    configured,
    isLoading,
    ready,
    error: resumesError ?? profileError ?? jobsError ?? null,
  };
}

function normalizeRemotePref(
  raw: UserProfile["remote_preference"],
): RemotePreference | null {
  if (raw === "remote" || raw === "hybrid" || raw === "onsite") return raw;
  return null;
}
