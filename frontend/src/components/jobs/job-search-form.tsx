"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost, isResumeApiConfigured } from "@/lib/api";
import { normalizeJobSearchResponse } from "@/lib/job-search";
import type { JobSearchHistoryItem, JobSearchResult } from "@/types";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface JobSearchFormProps {
  onResults: (r: JobSearchResult[]) => void;
  history?: JobSearchHistoryItem[];
  onSearchComplete?: () => void;
}

export function JobSearchForm({
  onResults,
  history = [],
  onSearchComplete,
}: JobSearchFormProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const raw = await apiPost<unknown>("/search", {
        query: query.trim(),
        location: location.trim() || undefined,
        remote_only: false,
        page: 1,
        per_page: 20,
      });
      const { results } = normalizeJobSearchResponse(raw);
      onResults(results);
      onSearchComplete?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Job title, keywords, or company"
          className="bg-zinc-900 border-zinc-800 text-white flex-1"
          required
        />
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          className="bg-zinc-900 border-zinc-800 text-white sm:w-48"
        />
        <Button
          type="submit"
          disabled={searching}
          className="bg-blue-600 hover:bg-blue-700 shrink-0"
        >
          {searching ? (
            "Searching…"
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Search
            </>
          )}
        </Button>
      </form>

      {isResumeApiConfigured() && history.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs text-zinc-500 mb-2">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/80 hover:bg-zinc-800 hover:border-zinc-600 transition-colors max-w-full"
                onClick={() => {
                  setQuery(h.query);
                  setLocation(h.location);
                }}
              >
                <span className="font-medium text-zinc-200">{h.query}</span>
                {h.location ? (
                  <span className="text-zinc-500"> · {h.location}</span>
                ) : null}
                <span className="text-zinc-500">
                  {" "}
                  · {h.result_count} result{h.result_count === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
