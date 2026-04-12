"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { normalizeJobSearchResponse } from "@/lib/job-search";
import type { JobSearchHistoryItem, JobSearchResult } from "@/types";
import { Clock, Search, GraduationCap } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface JobSearchFormProps {
  onResults: (r: JobSearchResult[], filters?: {
    studentFriendly?: boolean;
    jobType?: string;
    experienceLevel?: string;
  }) => void;
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
  const [studentFriendly, setStudentFriendly] = useState(false);
  const [jobType, setJobType] = useState("all");
  const [experienceLevel, setExperienceLevel] = useState("all");
  const [searching, setSearching] = useState(false);

  const executeSearch = useCallback(
    async (q: string, loc: string, remote: boolean, student: boolean, jType: string, expLevel: string) => {
      if (!q.trim()) return;
      setSearching(true);
      try {
        const searchQuery = student
          ? `${q.trim()} (part-time OR internship OR entry-level OR co-op OR undergrad OR student)`
          : q.trim();

        const raw = await apiPost<unknown>("/search", {
          query: searchQuery,
          location: loc.trim() || undefined,
          remote_only: remote,
          job_type: jobType !== "all" ? jobType : undefined,
          experience_level: experienceLevel !== "all" ? experienceLevel : undefined,
          page: 1,
          per_page: 20,
        });
        const { results } = normalizeJobSearchResponse(raw);
        onResults(results, {
          studentFriendly: student,
          jobType: jType !== "all" ? jType : undefined,
          experienceLevel: expLevel !== "all" ? expLevel : undefined,
        });
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
    void executeSearch(query, location, remoteOnly, studentFriendly, jobType, experienceLevel);
  };

  const runFromHistory = (h: JobSearchHistoryItem) => {
    setQuery(h.query);
    setLocation(h.location);
    setRemoteOnly(h.remote_only);
    void executeSearch(h.query, h.location, h.remote_only, studentFriendly, jobType, experienceLevel);
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
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="jobType" className="block text-xs font-medium text-zinc-400 mb-1">
              Job Type
            </label>
            <select
              id="jobType"
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white text-sm rounded focus:outline-none focus:border-blue-600"
            >
              <option value="all">All</option>
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="internship">Internship</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>

          <div>
            <label htmlFor="expLevel" className="block text-xs font-medium text-zinc-400 mb-1">
              Experience Level
            </label>
            <select
              id="expLevel"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white text-sm rounded focus:outline-none focus:border-blue-600"
            >
              <option value="all">All</option>
              <option value="intern">Intern</option>
              <option value="entry">Entry</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <label
              className={cn(
                "flex items-center gap-2 text-sm cursor-pointer select-none w-fit px-3 py-2 rounded border",
                studentFriendly
                  ? "bg-purple-900/30 border-purple-600 text-purple-200"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
              )}
            >
              <input
                type="checkbox"
                checked={studentFriendly}
                onChange={(e) => setStudentFriendly(e.target.checked)}
                className="rounded border-zinc-600 bg-zinc-900 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 focus:ring-offset-zinc-950"
              />
              <GraduationCap className="h-4 w-4" />
              Student-Friendly
            </label>
          </div>
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
          Remote only
        </label>
      </form>

      {isSupabaseConfigured() && history.length > 0 ? (
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
