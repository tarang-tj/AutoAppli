"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api";
import type { JobSearchResult } from "@/types";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function JobSearchForm({ onResults }: { onResults: (r: JobSearchResult[]) => void }) {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [searching, setSearching] = useState(false);
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const results = await apiPost<JobSearchResult[]>("/search", { query, location: location || undefined, source: "indeed" });
      onResults(results);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Search failed"); }
    finally { setSearching(false); }
  };
  return (
    <form onSubmit={handleSearch} className="flex gap-3">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Job title, keywords, or company" className="bg-zinc-900 border-zinc-800 text-white flex-1" required />
      <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" className="bg-zinc-900 border-zinc-800 text-white w-48" />
      <Button type="submit" disabled={searching} className="bg-blue-600 hover:bg-blue-700">{searching ? "Searching..." : <><Search className="h-4 w-4 mr-2" />Search</>}</Button>
    </form>
  );
}
