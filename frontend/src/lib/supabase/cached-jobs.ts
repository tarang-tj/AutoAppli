/**
 * Supabase-direct reads from the public.cached_jobs firehose (Sprint 4).
 *
 * RLS on `cached_jobs` allows anon + authenticated SELECT with no user filter,
 * so these queries work for signed-out browsers and for every user identically.
 * Writes are service-role only — the nightly cron is the sole writer.
 *
 * All queries default to `inactive_at IS NULL` so dead listings are hidden
 * from the Discover surface. Pass `includeInactive: true` if you're building
 * a stats page that wants historical coverage.
 */
import { createClient } from "./client";
import type { CachedJob } from "@/types";

function supabase() {
  return createClient();
}

// The column list is explicit (not `select("*")`) so adding columns to the
// table later doesn't silently balloon every payload. Keep in sync with the
// CachedJob type in types/index.ts.
const CACHED_JOB_COLUMNS = [
  "id",
  "source",
  "external_id",
  "title",
  "company",
  "url",
  "description",
  "location",
  "remote_type",
  "salary_min",
  "salary_max",
  "skills",
  "tags",
  "posted_at",
  "first_seen_at",
  "last_seen_at",
  "inactive_at",
].join(", ");

export type CachedJobSort =
  | "recent"   // last_seen_at desc — "what the cron just found"
  | "posted"   // posted_at desc — "what the ATS posted most recently"
  | "newest";  // first_seen_at desc — "new to our firehose"

export interface CachedJobsQuery {
  /** Free-text match against title + company (ilike, case-insensitive). */
  search?: string;
  /** Required skills (array contains) — ["python","sql"] means both. */
  skills?: string[];
  /** One of the three canonical remote types; omit for any. */
  remoteType?: "remote" | "hybrid" | "onsite";
  /** Exact company name match (case-insensitive). */
  company?: string;
  /** Only rows whose `posted_at` is within the last N days. */
  postedWithinDays?: number;
  /** Default `recent`. */
  sort?: CachedJobSort;
  /** Page size. Max is capped at 100 to protect the client. */
  limit?: number;
  /** 0-indexed offset. */
  offset?: number;
  /** Include rows marked inactive by the sweep pass. Default false. */
  includeInactive?: boolean;
}

export interface CachedJobsResult {
  rows: CachedJob[];
  /** Total matching rows across all pages (for pagination UI). */
  total: number;
}

/**
 * Run a filtered/paginated query against cached_jobs.
 *
 * Returns both the page of rows and the total match count. The count query
 * uses `count: "exact"` so the UI can render an accurate pagination footer;
 * on a table with a partial `inactive_at IS NULL` index this is cheap.
 */
export async function fetchCachedJobs(
  query: CachedJobsQuery = {},
): Promise<CachedJobsResult> {
  const limit = Math.min(Math.max(query.limit ?? 24, 1), 100);
  const offset = Math.max(query.offset ?? 0, 0);
  const sort: CachedJobSort = query.sort ?? "recent";

  let q = supabase()
    .from("cached_jobs")
    .select(CACHED_JOB_COLUMNS, { count: "exact" });

  if (!query.includeInactive) {
    q = q.is("inactive_at", null);
  }

  if (query.remoteType) {
    q = q.eq("remote_type", query.remoteType);
  }

  if (query.company) {
    q = q.ilike("company", query.company);
  }

  if (query.search && query.search.trim()) {
    const escaped = query.search.trim().replace(/[,()]/g, " ");
    // PostgREST `.or(...)` takes a comma-separated list of column.op.value —
    // we stripped commas above so this can't break the parser.
    q = q.or(`title.ilike.%${escaped}%,company.ilike.%${escaped}%`);
  }

  if (query.skills && query.skills.length > 0) {
    // `contains` on a text[] column translates to `skills @> ARRAY[...]`.
    q = q.contains("skills", query.skills);
  }

  if (query.postedWithinDays && query.postedWithinDays > 0) {
    const cutoff = new Date(
      Date.now() - query.postedWithinDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    q = q.gte("posted_at", cutoff);
  }

  const sortColumn =
    sort === "posted" ? "posted_at"
      : sort === "newest" ? "first_seen_at"
      : "last_seen_at";
  q = q
    .order(sortColumn, { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []) as unknown as CachedJob[],
    total: count ?? 0,
  };
}

/**
 * Fetch the distinct set of companies currently in the active firehose,
 * capped at 200. Used to populate the company filter dropdown without
 * dragging the full row payload across the wire.
 */
export async function fetchCachedJobCompanies(): Promise<string[]> {
  const { data, error } = await supabase()
    .from("cached_jobs")
    .select("company")
    .is("inactive_at", null)
    .limit(1000);
  if (error) throw new Error(error.message);
  const names = new Set<string>();
  for (const row of (data ?? []) as { company: string }[]) {
    if (row.company) names.add(row.company);
    if (names.size >= 200) break;
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

/**
 * Walk the active firehose and count how often each skill appears.
 * Returns the top N (default 30). Cheap enough to do client-side once
 * per session since the table is typically < 5k active rows.
 */
export async function fetchTopCachedJobSkills(
  topN: number = 30,
): Promise<{ skill: string; count: number }[]> {
  const { data, error } = await supabase()
    .from("cached_jobs")
    .select("skills")
    .is("inactive_at", null)
    .limit(5000);
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { skills: string[] | null }[]) {
    for (const s of row.skills ?? []) {
      const key = s.trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([skill, count]) => ({ skill, count }));
}

/**
 * Lookup a single cached job by its provider identity. Used by the "save
 * to kanban" action to find the source row so we can copy its fields
 * into the user's jobs table even if the caller only has `source`+`external_id`.
 */
export async function fetchCachedJobByExternal(
  source: string,
  externalId: string,
): Promise<CachedJob | null> {
  const { data, error } = await supabase()
    .from("cached_jobs")
    .select(CACHED_JOB_COLUMNS)
    .eq("source", source)
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as CachedJob | null;
}
