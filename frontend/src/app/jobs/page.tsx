"use client";
import { JobSearchForm } from "@/components/jobs/job-search-form";
import { JobListingCard } from "@/components/jobs/job-listing-card";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { getDemoJobSearchResults } from "@/lib/demo-data";
import { normalizeJobSearchHistory, normalizeJobSearchResponse } from "@/lib/job-search";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { JobSearchHistoryItem, JobSearchResult } from "@/types";
import { SearchX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function JobsPage() {
  const [demoMode] = useState(!isSupabaseConfigured());
  const [results, setResults] = useState<JobSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<JobSearchHistoryItem[]>([]);

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

  useEffect(() => {
    const id = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(id);
  }, [loadHistory]);

  const handleResults = useCallback((data: JobSearchResult[]) => {
    setResults(data);
    setSearched(true);
  }, []);

  const handleFormResults = (data: JobSearchResult[], _filters?: {
    studentFriendly?: boolean;
    jobType?: string;
    experienceLevel?: string;
  }) => {
    // apiPost("/search") already routes through Adzuna → Supabase → demo.
    // Always trust the API-layer results.
    handleResults(data);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Job Search</h1>
        <p className="text-zinc-200 text-sm mt-1 leading-relaxed max-w-2xl">
          Search thousands of live job listings powered by Adzuna.
          Find internships, entry-level roles, and part-time positions. Save any job to your tracker with one click.
        </p>
      </div>
      <JobSearchForm
        onResults={handleFormResults}
        history={history}
        onSearchComplete={() => void loadHistory()}
        onLoadCached={!demoMode ? loadCached : undefined}
      />
      {searched && results.length === 0 && (
        <Card className="mt-6 bg-zinc-900 border-zinc-800 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <SearchX className="h-10 w-10 text-zinc-600 mb-3" aria-hidden />
            <p className="text-zinc-300 font-medium">No jobs found</p>
            <p className="text-zinc-400 text-sm mt-1 max-w-md">
              Try different keywords, broaden your location, or adjust the filters above.
            </p>
          </CardContent>
        </Card>
      )}
      {results.length > 0 && (
        <div className="mt-4 mb-2 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {results.length} result{results.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((job, i) => (
            <JobListingCard key={`${job.url}-${i}`} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
