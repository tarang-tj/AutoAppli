"use client";

import useSWR from "swr";
import { apiGet, apiPost } from "@/lib/api";
import type { Resume, MatchScoresResponse } from "@/types";

/**
 * Fetches match scores for all jobs against the user's primary resume.
 * Returns a map of job_id → { score, matched_keywords, missing_keywords }.
 */
export function useMatchScores() {
  // First fetch resumes to get primary resume text
  const { data: resumes } = useSWR<Resume[]>(
    "/resumes",
    () => apiGet<Resume[]>("/resumes"),
    { revalidateOnFocus: false }
  );

  const primaryResume = resumes?.find((r) => r.is_primary) ?? resumes?.[0];
  const resumeText = primaryResume?.parsed_text || "";

  // Then fetch match scores if we have resume text
  const { data, isLoading, error } = useSWR<MatchScoresResponse>(
    resumeText ? ["/match/scores", resumeText.slice(0, 100)] : null,
    () => apiPost<MatchScoresResponse>("/match/scores", { resume_text: resumeText }),
    { revalidateOnFocus: false }
  );

  return {
    scores: data?.scores ?? {},
    isLoading: isLoading && Boolean(resumeText),
    hasResume: Boolean(resumeText),
    error,
  };
}
