"use client";
import { JobSearchForm } from "@/components/jobs/job-search-form";
import { JobListingCard } from "@/components/jobs/job-listing-card";
import { apiGet, isResumeApiConfigured } from "@/lib/api";
import { getDemoJobSearchResults } from "@/lib/demo-data";
import { normalizeJobSearchHistory } from "@/lib/job-search";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { JobSearchHistoryItem, JobSearchResult } from "@/types";
import { useCallback, useEffect, useState } from "react";

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
        <p className="tex