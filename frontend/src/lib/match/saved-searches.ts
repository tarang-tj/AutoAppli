/**
 * Saved-search persistence layer.
 *
 * Two storage backends, selected at runtime:
 *   - localStorage: demo mode + logged-out users + supabase-direct fallback
 *   - supabase: when a session exists, sync across devices
 *
 * Keep the API tiny so the UI doesn't care which backend is active.
 */

export interface SavedSearchFilters {
  query?: string;
  remoteType?: "remote" | "hybrid" | "onsite" | "any";
  seniority?: string | null;
  skills?: string[];
  hideApplied?: boolean;
  salaryMin?: number | null;
  sortBy?: "match" | "recency" | "salary";
}

export interface SavedSearch {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "autoappli:saved-searches:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): SavedSearch[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is SavedSearch =>
      s && typeof s === "object" && typeof s.id === "string" && typeof s.name === "string"
    );
  } catch {
    return [];
  }
}

function writeAll(searches: SavedSearch[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // quota exceeded or blocked — silently drop
  }
}

function makeId(): string {
  return `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** List all saved searches, most-recently-updated first. */
export function listSavedSearches(): SavedSearch[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Create or replace a saved search. Returns the stored record. */
export function upsertSavedSearch(input: { id?: string; name: string; filters: SavedSearchFilters }): SavedSearch {
  const now = Date.now();
  const all = readAll();
  const existingIdx = input.id ? all.findIndex((s) => s.id === input.id) : -1;
  if (existingIdx >= 0) {
    const updated: SavedSearch = {
      ...all[existingIdx],
      name: input.name,
      filters: input.filters,
      updatedAt: now,
    };
    all[existingIdx] = updated;
    writeAll(all);
    return updated;
  }
  const created: SavedSearch = {
    id: input.id ?? makeId(),
    name: input.name,
    filters: input.filters,
    createdAt: now,
    updatedAt: now,
  };
  all.push(created);
  writeAll(all);
  return created;
}

/** Delete a saved search by id. No-op if not found. */
export function deleteSavedSearch(id: string): void {
  const all = readAll().filter((s) => s.id !== id);
  writeAll(all);
}

/** Fetch a saved search by id. */
export function getSavedSearch(id: string): SavedSearch | null {
  return readAll().find((s) => s.id === id) ?? null;
}
