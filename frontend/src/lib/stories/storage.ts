/**
 * Story Library — storage façade.
 *
 * STAR-format stories that students bank once and reuse across every
 * interview. v1 lives in localStorage; v2 (this file) is a façade that
 * routes to the FastAPI backend when it is configured AND the user is
 * authenticated, and falls back to localStorage otherwise (demo mode,
 * unauthenticated visits).
 *
 * Public API is unchanged from the localStorage-only version so that
 * `stories/page.tsx` and `story-form.tsx` need zero modifications:
 *   getStoriesSnapshot()       — useSyncExternalStore client snapshot
 *   getStoriesServerSnapshot() — useSyncExternalStore SSR snapshot
 *   subscribeStories(cb)       — subscribe + return unsubscribe fn
 *   writeStory(input)          — upsert, returns the Story synchronously
 *   deleteStory(id)            — delete
 *
 * Migration helper (not auto-called):
 *   migrateLocalStoriesToCloud() — uploads localStorage stories to API
 *
 * SSR safety: every helper guards on `typeof window`.
 */

import { isJobsApiConfigured, apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-mode";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoryTag =
  | "leadership"
  | "conflict"
  | "technical"
  | "failure"
  | "ambiguity"
  | "deadline"
  | "teamwork"
  | "ownership"
  | "communication"
  | "creativity";

export const STORY_TAGS: readonly StoryTag[] = [
  "leadership",
  "conflict",
  "technical",
  "failure",
  "ambiguity",
  "deadline",
  "teamwork",
  "ownership",
  "communication",
  "creativity",
] as const;

export interface Story {
  id: string;
  title: string;
  tags: StoryTag[];
  situation: string;
  task: string;
  action: string;
  result: string;
  createdAt: number;
  updatedAt: number;
}

export type StoryInput = Omit<Story, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const STORIES_KEY = "autoappli_stories_v1";
const MIGRATION_FLAG_KEY = "autoappli_stories_migrated_v1";

const EMPTY: Story[] = [];

// ─── In-memory API cache (API-backed mode) ────────────────────────────────────
// When API-backed, we keep a local cache to avoid re-fetching on every render.
// The cache is invalidated after any write and re-populated lazily.

let _apiCache: Story[] | null = null;
let _apiFetchPromise: Promise<void> | null = null;

// localStorage-mode snapshot cache. getStoriesSnapshot must return a stable
// reference between store events for useSyncExternalStore (React 19), or
// the renderer falls into an infinite re-render loop and throws #185.
// readStories() builds a fresh array on every call (filter / []), so we
// memoize it here and invalidate on storage events + writes.
let _lsCache: Story[] | null = null;

// ─── Subscriber set ──────────────────────────────────────────────────────────

const _subscribers = new Set<() => void>();

function _notifySubscribers(): void {
  for (const cb of _subscribers) cb();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isStoryTag(v: unknown): v is StoryTag {
  return typeof v === "string" && (STORY_TAGS as readonly string[]).includes(v);
}

function isStory(v: unknown): v is Story {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    Array.isArray(s.tags) &&
    s.tags.every(isStoryTag) &&
    typeof s.situation === "string" &&
    typeof s.task === "string" &&
    typeof s.action === "string" &&
    typeof s.result === "string" &&
    typeof s.createdAt === "number" &&
    typeof s.updatedAt === "number"
  );
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `story_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Mode detection ───────────────────────────────────────────────────────────

/**
 * Returns true when we should use the API (backend configured + Supabase
 * configured + not in demo mode + browser). Session check is async, so
 * the write/read path does an additional async auth check before calling
 * the API; this is the cheap synchronous pre-check.
 */
function _shouldUseApi(): boolean {
  if (typeof window === "undefined") return false;
  if (isDemoMode()) return false;
  return isJobsApiConfigured() && isSupabaseConfigured();
}

/**
 * Returns the current Supabase session access token, or null if not
 * signed in. Used to confirm auth before API calls.
 */
async function _getAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Full check: synchronous pre-check AND async session confirmation.
 * Returns true only when the user has a valid Supabase session.
 */
async function _useApiForCurrentUser(): Promise<boolean> {
  if (!_shouldUseApi()) return false;
  const token = await _getAccessToken();
  return token !== null;
}

// ─── API row → Story conversion ───────────────────────────────────────────────

interface ApiStoryRow {
  id: string;
  title: string;
  tags: string[];
  situation: string;
  task: string;
  action: string;
  result: string;
  created_at: string;
  updated_at: string;
}

function _apiRowToStory(row: ApiStoryRow): Story {
  return {
    id: row.id,
    title: row.title,
    tags: (row.tags ?? []).filter(isStoryTag) as StoryTag[],
    situation: row.situation ?? "",
    task: row.task ?? "",
    action: row.action ?? "",
    result: row.result ?? "",
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

// ─── API-backed read (async, populates cache) ─────────────────────────────────

function _refreshApiCache(): void {
  // Deduplicate concurrent refreshes.
  if (_apiFetchPromise) return;
  _apiFetchPromise = (async () => {
    try {
      const rows = await apiGet<ApiStoryRow[]>("/stories");
      _apiCache = Array.isArray(rows) ? rows.map(_apiRowToStory) : [];
    } catch {
      // On failure keep stale cache (or empty) — don't crash the UI.
      if (_apiCache === null) _apiCache = [];
    } finally {
      _apiFetchPromise = null;
    }
    _notifySubscribers();
  })();
}

// ─── localStorage helpers (fallback mode) ─────────────────────────────────────

function lsGet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORIES_KEY);
  } catch {
    return null;
  }
}

function lsSet(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORIES_KEY, value);
    // Same-tab notification — useSyncExternalStore subscribers wake up.
    window.dispatchEvent(new StorageEvent("storage", { key: STORIES_KEY }));
  } catch {
    /* private browsing / quota — silently ignore */
  }
}

export function readStories(): Story[] {
  const raw = lsGet();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStory);
  } catch {
    return [];
  }
}

function writeAll(stories: Story[]): void {
  _lsCache = null; // invalidate so next snapshot re-reads
  lsSet(JSON.stringify(stories));
}

/** Stable-reference accessor for localStorage mode. Never returns a fresh
 * array unless the underlying data actually changed (write or storage event). */
function readStoriesCached(): Story[] {
  if (_lsCache !== null) return _lsCache;
  _lsCache = readStories();
  return _lsCache;
}

// ─── Public write API ─────────────────────────────────────────────────────────

/**
 * Upsert a story.
 *
 * Returns the story synchronously from the optimistic local state so the
 * form can close immediately. When the backend is configured the call is
 * also dispatched async and the cache is refreshed on completion.
 */
export function writeStory(input: StoryInput): Story {
  const now = Date.now();

  // --- Optimistic local write first (always) ---
  let result: Story;

  if (_shouldUseApi() && _apiCache !== null) {
    // API-backed mode: operate on the in-memory cache optimistically.
    if (input.id) {
      const idx = _apiCache.findIndex((s) => s.id === input.id);
      if (idx >= 0) {
        result = {
          ..._apiCache[idx],
          title: input.title,
          tags: input.tags,
          situation: input.situation,
          task: input.task,
          action: input.action,
          result: input.result,
          updatedAt: now,
        };
        _apiCache = [
          ..._apiCache.slice(0, idx),
          result,
          ..._apiCache.slice(idx + 1),
        ];
      } else {
        // id supplied but not in cache — treat as create
        result = _buildNewStory(input, now);
        _apiCache = [result, ..._apiCache];
      }
    } else {
      result = _buildNewStory(input, now);
      _apiCache = [result, ..._apiCache];
    }
    _notifySubscribers();

    // Fire async API call in background.
    void _writeStoryToApi(result, input.id);
    return result;
  }

  // --- localStorage mode ---
  const all = readStories();
  if (input.id) {
    const idx = all.findIndex((s) => s.id === input.id);
    if (idx >= 0) {
      result = {
        ...all[idx],
        title: input.title,
        tags: input.tags,
        situation: input.situation,
        task: input.task,
        action: input.action,
        result: input.result,
        updatedAt: now,
      };
      const next = all.slice();
      next[idx] = result;
      writeAll(next);
      return result;
    }
  }
  result = _buildNewStory(input, now);
  writeAll([result, ...all]);
  return result;
}

function _buildNewStory(input: StoryInput, now: number): Story {
  return {
    id: input.id ?? newId(),
    title: input.title,
    tags: input.tags,
    situation: input.situation,
    task: input.task,
    action: input.action,
    result: input.result,
    createdAt: now,
    updatedAt: now,
  };
}

async function _writeStoryToApi(story: Story, existingId?: string): Promise<void> {
  try {
    const isUpdate = Boolean(existingId && _apiCache?.some((s) => s.id === existingId));
    // Re-check auth before the async call.
    if (!(await _useApiForCurrentUser())) return;

    if (isUpdate && existingId) {
      await apiPatch<ApiStoryRow>(`/stories/${existingId}`, {
        title: story.title,
        tags: story.tags,
        situation: story.situation,
        task: story.task,
        action: story.action,
        result: story.result,
      });
    } else {
      await apiPost<ApiStoryRow>("/stories", {
        title: story.title,
        tags: story.tags,
        situation: story.situation,
        task: story.task,
        action: story.action,
        result: story.result,
      });
    }
    // Refresh from server to get canonical IDs / timestamps.
    _apiCache = null;
    _refreshApiCache();
  } catch {
    // API write failed — cache was already optimistically updated.
    // Subscribers will see the optimistic value; on next refresh it'll reconcile.
  }
}

/**
 * Delete a story.
 */
export function deleteStory(id: string): void {
  if (_shouldUseApi() && _apiCache !== null) {
    // Optimistic remove from cache.
    _apiCache = _apiCache.filter((s) => s.id !== id);
    _notifySubscribers();
    // Async delete.
    void _deleteStoryFromApi(id);
    return;
  }

  // localStorage mode
  const all = readStories();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) return;
  writeAll(next);
}

async function _deleteStoryFromApi(id: string): Promise<void> {
  try {
    if (!(await _useApiForCurrentUser())) return;
    await apiDelete(`/stories/${id}`);
  } catch {
    // If delete failed, re-fetch to reconcile.
    _apiCache = null;
    _refreshApiCache();
  }
}

// ─── useSyncExternalStore helpers ─────────────────────────────────────────────

/**
 * Subscribe to story changes. Compatible with useSyncExternalStore.
 *
 * When API-backed, also registers a StorageEvent listener (for cross-tab
 * consistency in the rare case localStorage is used as fallback).
 */
export function subscribeStories(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  _subscribers.add(cb);

  // Cross-tab localStorage events (localStorage fallback mode).
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORIES_KEY || e.key === null) {
      _lsCache = null; // invalidate before notifying
      cb();
    }
  };
  window.addEventListener("storage", storageHandler);

  // If in API mode and cache is empty, kick off initial fetch.
  if (_shouldUseApi() && _apiCache === null) {
    _refreshApiCache();
  }

  return () => {
    _subscribers.delete(cb);
    window.removeEventListener("storage", storageHandler);
  };
}

/**
 * Client-side snapshot for useSyncExternalStore.
 *
 * In API-backed mode: returns the in-memory cache (populated lazily).
 * In localStorage mode: returns the localStorage contents.
 */
export function getStoriesSnapshot(): Story[] {
  if (_shouldUseApi()) {
    if (_apiCache === null) {
      // Cache not yet populated — kick off fetch and return empty for now.
      _refreshApiCache();
      return EMPTY;
    }
    return _apiCache;
  }
  return readStoriesCached();
}

/**
 * SSR snapshot — always empty (stories are user-specific, never server-rendered).
 */
export function getStoriesServerSnapshot(): Story[] {
  return EMPTY;
}

// ─── Migration status helpers ────────────────────────────────────────────────

/**
 * Returns true when localStorage has stories that have NOT yet been migrated
 * to the cloud (i.e. the migration flag is absent). Safe to call on the
 * client; always returns false during SSR.
 */
export function hasUnmigratedLocalStories(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const alreadyMigrated =
      window.localStorage.getItem(MIGRATION_FLAG_KEY) === "true";
    if (alreadyMigrated) return false;
    const raw = window.localStorage.getItem(STORIES_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

// ─── Cloud migration helper ───────────────────────────────────────────────────

/**
 * One-time migration: read localStorage stories and POST each to the API.
 * Sets `autoappli_stories_migrated_v1=true` in localStorage afterward so
 * subsequent calls are no-ops.
 *
 * NOT auto-called. The orchestrator may surface a UI button to trigger this.
 * Returns the number of stories migrated, or 0 if already migrated / nothing to migrate.
 */
export async function migrateLocalStoriesToCloud(): Promise<number> {
  if (typeof window === "undefined") return 0;

  // Check migration flag.
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === "true") return 0;
  } catch {
    return 0;
  }

  // Must be authenticated.
  if (!(await _useApiForCurrentUser())) return 0;

  const localStories = readStories();
  if (localStories.length === 0) {
    // Nothing to migrate — still set the flag.
    try {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, "true");
    } catch { /* ignore */ }
    return 0;
  }

  let migrated = 0;
  for (const story of localStories) {
    try {
      await apiPost<ApiStoryRow>("/stories", {
        title: story.title,
        tags: story.tags,
        situation: story.situation,
        task: story.task,
        action: story.action,
        result: story.result,
      });
      migrated++;
    } catch {
      // Best-effort — skip failures, still mark migrated at end.
    }
  }

  try {
    window.localStorage.setItem(MIGRATION_FLAG_KEY, "true");
  } catch { /* ignore */ }

  // Invalidate cache so new data is fetched.
  _apiCache = null;
  _refreshApiCache();

  return migrated;
}
