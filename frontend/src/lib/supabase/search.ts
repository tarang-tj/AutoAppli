/**
 * Direct Supabase client operations for the `job_listings` table (search).
 * Also persists search history to `job_searches` and `job_search_result_items`.
 */
import { createClient } from "./client";
import type { JobSearchResult, JobSearchHistoryItem } from "@/types";

function supabase() {
  return createClient();
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase().auth.getUser();
  return data.user?.id ?? null;
}

// ── Search ──

export async function searchListings(params: {
  query: string;
  location?: string;
  remote_only?: boolean;
  page?: number;
  per_page?: number;
}): Promise<{ results: JobSearchResult[]; search_id: string | null; persisted: boolean }> {
  const { query, location, remote_only, page = 1, per_page = 20 } = params;
  const sb = supabase();

  // Full-text search: match title, company, snippet, or location
  const searchTerms = query.trim().toLowerCase().split(/\s+/);

  let q = sb
    .from("job_listings")
    .select("*")
    .order("last_seen_at", { ascending: false });

  // Apply text search filters — each term must match at least one column
  for (const term of searchTerms) {
    const pattern = `%${term}%`;
    q = q.or(
      `title.ilike.${pattern},company.ilike.${pattern},snippet.ilike.${pattern},location.ilike.${pattern}`
    );
  }

  // Location filter
  if (location?.trim()) {
    q = q.ilike("location", `%${location.trim()}%`);
  }

  // Remote filter
  if (remote_only) {
    q = q.ilike("location", "%remote%");
  }

  // Pagination
  const from = (page - 1) * per_page;
  q = q.range(from, from + per_page - 1);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const results: JobSearchResult[] = (data ?? []).map((row) => ({
    title: row.title,
    company: row.company,
    location: row.location ?? "",
    url: row.url,
    snippet: row.snippet ?? "",
    posted_date: row.posted_date ?? undefined,
    source: row.source ?? "unknown",
  }));

  // Persist search to history if user is authenticated
  let searchId: string | null = null;
  const userId = await getUserId();
  if (userId) {
    try {
      const { data: searchRow } = await sb
        .from("job_searches")
        .insert({
          user_id: userId,
          query,
          location: location ?? "",
          remote_only: remote_only ?? false,
          page,
          per_page,
          result_count: results.length,
        })
        .select("id")
        .single();

      if (searchRow) {
        searchId = searchRow.id;
        // Link results to this search
        if (results.length > 0 && data) {
          const items = data.map((row, idx) => ({
            search_id: searchId!,
            listing_id: row.id,
            sort_order: idx,
          }));
          await sb.from("job_search_result_items").insert(items);
        }
      }
    } catch {
      // Non-critical — search still works without history
    }
  }

  return { results, search_id: searchId, persisted: Boolean(searchId) };
}

// ── History ──

export async function fetchSearchHistory(limit = 12): Promise<JobSearchHistoryItem[]> {
  const { data, error } = await supabase()
    .from("job_searches")
    .select("id, query, location, remote_only, result_count, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as JobSearchHistoryItem[];
}

// ── Cached results from a previous search ──

export async function fetchSearchResults(
  searchId: string
): Promise<{ results: JobSearchResult[]; search_id: string; from_cache: boolean; persisted: boolean }> {
  const sb = supabase();

  const { data: items, error } = await sb
    .from("job_search_result_items")
    .select("listing_id, sort_order")
    .eq("search_id", searchId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  if (!items || items.length === 0) {
    return { results: [], search_id: searchId, from_cache: true, persisted: true };
  }

  const listingIds = items.map((i) => i.listing_id);
  const { data: listings } = await sb
    .from("job_listings")
    .select("*")
    .in("id", listingIds);

  // Re-sort by original order
  const byId = new Map((listings ?? []).map((l) => [l.id, l]));
  const results: JobSearchResult[] = items
    .map((item) => {
      const row = byId.get(item.listing_id);
      if (!row) return null;
      return {
        title: row.title,
        company: row.company,
        location: row.location ?? "",
        url: row.url,
        snippet: row.snippet ?? "",
        posted_date: row.posted_date ?? undefined,
        source: row.source ?? "unknown",
      };
    })
    .filter(Boolean) as JobSearchResult[];

  return { results, search_id: searchId, from_cache: true, persisted: true };
}
