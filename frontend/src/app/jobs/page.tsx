"use client";
import { JobSearchForm } from "@/components/jobs/job-search-form";
import { JobListingCard } from "@/components/jobs/job-listing-card";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getDemoJobSearchResults } from "@/lib/demo-data";
import type { JobSearchResult } from "@/types";
import { useState } from "react";

export default function JobsPage() {
  const [demoMode] = useState(!isSupabaseConfigured());
  const [results, setResults] = useState<JobSearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleResults = (data: JobSearchResult[]) => {
    setResults(data);
    setSearched(true);
  };

  const handleFormResults = (data: JobSearchResult[]) => {
    if (demoMode) {
      handleResults(getDemoJobSearchResults());
    } else {
      handleResults(data);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Job Search</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Search job boards and save interesting positions to your tracker
        </p>
      </div>
      <JobSearchForm onResults={handleFormResults} />
      {searched && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500">No jobs found. Try different search terms.</p>
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
