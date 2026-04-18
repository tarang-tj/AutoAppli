"use client";
import { JobSearchForm } from "@/components/jobs/job-search-form";
import { JobListingCard } from "@/components/jobs/job-listing-card";
import { FitBadge } from "@/components/jobs/search-accuracy/fit-badge";
import { SmartFilters, type SmartFilterState } from "@/components/jobs/search-accuracy/smart-filters";
import {
  applySmartFilters,
  type RankedJob,
} from "@/components/jobs/search-accuracy/apply-filters";
import { apiGet } from "@/lib/api";
import { getDemoJobSearchResults } from "@/lib/demo-data";
import { normalizeJobSearchHistory, normalizeJobSearchResponse } from "@/lib/job-search";
import {
  rankJobs,
  toCandidateProfile,
  toJobProfile,
  type CandidateProfile,
  type JobLike,
} from "@/lib/match";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { JobSearchHistoryItem, JobSearchResult, ProfileResponse } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// Initial state for the smart filter panel — kept in sync with SavedSearchFilters.
const INITIAL_FILTERS: SmartFilterState = {
  query: "",
  remoteType: "any",
  seniority: null,
  skills: [],
  hideApplied: false,
  salaryMin: null,
  sortBy: "match",
};

/**
 * Bridge a `JobSearchResult` (the shape returned by /search) onto the
 * `JobLike` shape the match-scoring adapters expect.
 *
 * `JobSearchResult` lacks an `id`, so we synthesize a stable one from `url`
 * (which is unique per posting) so React keys remain stable across rerenders.
 */
function searchResultToJobLike(r: JobSearchResult): JobLike & { id: string } {
  return {
    id: r.url,
    title: r.title,
    company: r.company,
    description: r.snippet,
    location: r.location,
    salary: r.salary ?? null,
    posted_at: r.posted_date ?? null,
  };
}

export default function JobsPage() {
  const [demoMode] = useState(!isSupabaseConfigured());
  const [results, setResults] = useState<JobSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<JobSearchHistoryItem[]>([]);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [filters, setFilters] = useState<SmartFilterState>(INITIAL_FILTERS);

  const loadHistory = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setHistory([]);
      return;
    }
    try {
      const raw = await apiGet<unknown>("/search/history?limit=5");
      setHistory(normalizeJobSearchHistory(raw));
    } catch {
      setHistory([]);
    }
  }, []);

  // Pull the candidate's profile on mount so we can score matches.
  // Tolerant of all three modes (FastAPI / Supabase-direct / demo) because
  // apiGet handles the fallback chain itself.
  const loadProfile = useCallback(async () => {
    try {
      const p = await apiGet<ProfileResponse>("/profile");
      setProfile(p);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadHistory();
      void loadProfile();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadHistory, loadProfile]);

  const handleResults = useCallback((data: JobSearchResult[]) => {
    setResults(data);
    setSearched(true);
  }, []);

  const handleFormResults = (data: JobSearchResult[]) => {
    if (demoMode) {
      handleResults(getDemoJobSearchResults());
    } else {
      handleResults(data);
    }
  };

  const loadCached = useCallback(
    async (searchId: string) => {
      if (demoMode) return;
      const raw = await apiGet<unknown>(`/search/runs/${searchId}/results`);
      const { results: cached } = normalizeJobSearchResponse(raw);
      if (!cached.length) {
        toast.info("No saved listings for this search.");
      }
      handleResults(cached);
    },
    [demoMode, handleResults]
  );

  // Build a CandidateProfile once per profile change. When there's no profile
  // (or the user is signed out in demo mode), `candidate` is null and the
  // scorer is skipped — we still render every result, just without badges.
  const candidate: CandidateProfile | null = useMemo(() => {
    if (!profile) return null;
    return toCandidateProfile(profile);
  }, [profile]);

  // Score + rank every search result against the candidate. When `candidate`
  // is null we keep the original ordering and emit `match: null` so callers
  // (FitBadge, applySmartFilters) can degrade gracefully.
  const ranked = useMemo<Array<RankedJob & { searchResult: JobSearchResult }>>(() => {
    if (!candidate) {
      return results.map((r) => ({
        searchResult: r,
        job: toJobProfile(searchResultToJobLike(r)),
        match: null as never, // match optional in this branch — see filter+render below
      }));
    }
    const jobLikes = results.map(searchResultToJobLike);
    const jobProfiles = jobLikes.map((j) => toJobProfile(j));
    const ranking = rankJobs(jobProfiles, candidate);
    // rankJobs sorts internally — preserve mapping back to the original
    // JobSearchResult by id.
    const byId = new Map(results.map((r) => [r.url, r]));
    return ranking
      .map(({ job, match }) => {
        const sr = byId.get(job.id ?? "");
        if (!sr) return null;
        return { searchResult: sr, job, match };
      })
      .filter((x): x is RankedJob & { searchResult: JobSearchResult } => x !== null);
  }, [results, candidate]);

  // Apply the smart filters / sort. When match is null (no profile loaded
  // yet) we synthesize a zero match so the filter still works on title /
  // remote / seniority / skills inferred from the posting alone.
  const filtered = useMemo(() => {
    const enriched: RankedJob[] = ranked.map(({ job, match }) => ({
      job,
      match: match ?? {
        score: 0,
        scoreExact: 0,
        breakdown: [],
        matchedSkills: [],
        missingSkills: [],
        extraSkills: [],
        headline: "",
      },
    }));
    const result = applySmartFilters(enriched, filters);
    // Re-attach searchResult by id so we can render JobListingCard.
    const byId = new Map(ranked.map((r) => [r.job.id ?? "", r]));
    return result
      .map((r) => byId.get(r.job.id ?? ""))
      .filter((x): x is RankedJob & { searchResult: JobSearchResult } => Boolean(x));
  }, [ranked, filters]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Job Search</h1>
        <p className="text-zinc-200 text-sm mt-1 leading-relaxed max-w-2xl">
          Search 178+ internship listings from LinkedIn, Indeed, and Handshake.
          Save positions to your tracker with one click.
        </p>
      </div>
      <JobSearchForm
        onResults={handleFormResults}
        history={history}
        onSearchComplete={() => void loadHistory()}
        onLoadCached={!demoMode ? loadCached : undefined}
      />
      {searched && results.length > 0 && (
        <div className="mt-4">
          <SmartFilters
            value={filters}
            onChange={setFilters}
            candidateSkills={candidate?.skills ?? []}
            hasMatchScores={Boolean(candidate)}
          />
        </div>
      )}
      {searched && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-300">No jobs found. Try different search terms.</p>
        </div>
      )}
      {results.length > 0 && (
        <div className="mt-4 mb-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {filtered.length} of {results.length} result
            {results.length === 1 ? "" : "s"}
            {candidate ? " — ranked by fit" : ""}
          </span>
        </div>
      )}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(({ searchResult, match }, i) => (
            <div key={`${searchResult.url}-${i}`} className="relative">
              {candidate && match && (
                <div className="absolute right-3 top-3 z-10">
                  <FitBadge match={match} />
                </div>
              )}
              <JobListingCard job={searchResult} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
