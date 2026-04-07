import type { JobSearchResult, JobSearchHistoryItem } from "@/types";

export type JobSearchApiResponse = {
  results: JobSearchResult[];
  search_id: string | null;
  persisted: boolean;
};

function mapSearchRow(row: unknown): JobSearchResult {
  const r = row as Record<string, unknown>;
  return {
    title: String(r.title ?? ""),
    company: String(r.company ?? ""),
    location: String(r.location ?? ""),
    url: String(r.url ?? ""),
    snippet: String(r.snippet ?? r.description_snippet ?? ""),
    posted_date: r.posted_date ? String(r.posted_date) : undefined,
    source: String(r.source ?? "unknown"),
  };
}

/** Normalizes POST /search (wrapper or legacy array) and demo responses. */
export function normalizeJobSearchResponse(data: unknown): JobSearchApiResponse {
  if (Array.isArray(data)) {
    return {
      results: data.map(mapSearchRow),
      search_id: null,
      persisted: false,
    };
  }
  if (data && typeof data === "object" && "results" in data) {
    const o = data as {
      results?: unknown;
      search_id?: string | null;
      persisted?: boolean;
    };
    const results = Array.isArray(o.results) ? o.results.map(mapSearchRow) : [];
    return {
      results,
      search_id: typeof o.search_id === "string" ? o.search_id : null,
      persisted: Boolean(o.persisted),
    };
  }
  return { results: [], search_id: null, persisted: false };
}

export function normalizeJobSearchHistory(data: unknown): JobSearchHistoryItem[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      query: String(r.query ?? ""),
      location: String(r.location ?? ""),
      remote_only: Boolean(r.remote_only),
      result_count: Number(r.result_count ?? 0),
      created_at: String(r.created_at ?? ""),
    };
  });
}
