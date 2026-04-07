"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost, isResumeApiConfigured } from "@/lib/api";
import { normalizeJobSearchResponse } from "@/lib/job-search";
import type { JobSearchHistoryItem, JobSearchResult } from "@/types";
import { Clock, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface JobSearchFormProps {
  onResults: (r: JobSearchResult[]) => void;
  history?: JobSearchHistoryItem[];
  onSearchComplete?: () => void;
  onLoadCached?: (searchId: string) => Promise<void>;
}

export function JobSearchForm({
  onResults,
  history = [],
  onSearchComplete,
  onLoadCached,
}: JobSearchFormProps) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [searching, setSearching] = useState(false);

  const executeSearch = useCallback(
    async (q: string, loc: string, remote: boolean) => {
      if (!q.trim()) return;
      setSearching(true);
      try {
        const raw = await apiPost<unknown>("/search", {
          query: q.trim(),
          location: loc.trim() || undefined,
          remote_only: remote,
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
    },
    [onResults, onSearchComplete]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeSearch(query, location, remoteOnly);
  };

  const runFromHistory = (h: JobSearchHistoryItem) => {
    setQuery(h.query);
    setLocation(h.location);
    setRemoteOnly(h.remote_only);
    void executeSearch(h.query, h.location, h.remote_only);
  };

  const handleLoadCached = async (searchId: string) => {
    if (!onLoadCached) return;
    try {
      await onLoadCached(searchId);
    } catch {
      toast.error("Could not load saved results.");
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
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
        </div>
        <label
          className={cn(
            "flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none w-fit",
            remoteOnly && "text-zinc-300"
          )}
        >
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-zinc-950"
          />
          Remote only (Indeed remote filter)
        </label>
      </form>

      {isResumeApiConfigured() && history.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs text-zinc-500 mb-2">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-stretch rounded-lg border border-zinc-700/80 bg-zinc-800/80 overflow-hidden max-w-full"
              >
                <button
                  type="button"
                  className="text-left text-xs px-2.5 py-1.5 text-zinc-300 hover:bg-zinc-800 min-w-0 flex-1"
                  onClick={() => runFromHistory(h)}
                  disabled={searching}
                >
                  <span className="font-medium text-zinc-200">{h.query}</span>
                  {h.location ? (
                    <span className="text-zinc-500"> · {h.location}</span>
                  ) : null}
                  {h.remote_only ? (
                    <span className="text-blue-400/90"> · remote</span>
                  ) : null}
                  <span className="text-zinc-500">
                    {" "}
                    · {h.result_count} result{h.result_count === 1 ? "" : "s"}
                  </span>
                </button>
                {onLoadCached && h.result_count > 0 ? (
                  <button
                    type="button"
                    title="Load saved results (no new scrape)"
                    className="shrink-0 px-2 border-l border-zinc-700/80 text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/90 disabled:opacity-40"
                    disabled={searching}
                    onClick={() => void handleLoadCached(h.id)}
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
