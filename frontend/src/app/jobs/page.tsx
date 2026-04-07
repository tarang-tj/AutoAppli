"use client";
import { JobSearchForm } from "@/components/jobs/job-search-form";
import { JobListingCard } from "@/components/jobs/job-listing-card";
import { apiGet, isResumeApiConfigured } from "@/lib/api";
import { getDemoJobSearchResults } from "@/lib/demo-data";
import { normalizeJobSearchHistory, normalizeJobSearchResponse } from "@/lib/job-search";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { JobSearchHistoryItem, JobSearchResult } from "@/types";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function JobsPage() {
  const [demoMode] = useState(!isSupabaseConfigured());
  const [results, setResults] = useState<JobSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<JobSearchHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    if (!isResumeApiConfigured() || !isSupabaseConfigured()) {
      setHistory([]);
      return;
    }
    try {
      const raw = await apiGet<unknown>("/search/history?limit=12");
      setHistory(normalizeJobSearchHistory(raw));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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
      if (!isResumeApiConfigured() || demoMode) return;
      const raw = await apiGet<unknown>(`/search/runs/${searchId}/results`);
      const { results } = normalizeJobSearchResponse(raw);
      if (!results.length) {
        toast.info("No saved listings for this search.");
      }
      handleResults(results);
    },
    [demoMode, handleResults]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Job Search</h1>
        <p className="text-zinc-200 text-sm mt-1 leading-relaxed max-w-2xl">
          Search job boards and save interesting positions to your tracker. Signed-in users with a
          connected API also get searchable history.
        </p>
      </div>
      <JobSearchForm
        onResults={handleFormResults}
        history={history}
        onSearchComplete={() => void loadHistory()}
        onLoadCached={!demoMode ? loadCached : undefined}
      />
      {searched && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-300">No jobs found. Try different search terms.</p>
        </div>
      )}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {results.map((job, i) => (
            <JobListingCard key={`${job.url}-${i}`} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
