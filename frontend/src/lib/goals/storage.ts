/**
 * Goal Tracker — storage façade (dual-mode: Supabase API or localStorage).
 *
 * v1 was localStorage-only. This v2 façade routes to the FastAPI backend
 * when configured + authenticated, and falls back to localStorage for demo
 * mode, unauthenticated visits, and offline use.
 *
 * Public API is unchanged from v1 so that goal-tracker.tsx requires ZERO
 * modification:
 *   getGoalConfigSnapshot()       — useSyncExternalStore client snapshot
 *   getGoalConfigServerSnapshot() — useSyncExternalStore SSR snapshot
 *   subscribeGoalConfig(cb)       — subscribe + return unsubscribe fn
 *   setGoalConfig(partial)        — optimistic write (local + async API)
 *
 * New migration helpers (not auto-called):
 *   migrateLocalGoalsToCloud()    — one-time upload of localStorage config
 *   hasUnmigratedLocalGoals()     — returns true when migration is needed
 *
 * SSR safety: every helper guards on `typeof window`.
 * Cache contract: snapshot functions MUST return stable object references
 * between events — _apiCache and _lsCache satisfy this for React 19.
 */

import { isJobsApiConfigured, apiGet, apiPatch } from "@/lib/api";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/demo-mode";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalConfig = {
  weekly_target: number; // default 10
  start_date: string;    // ISO yyyy-mm-dd
  updated_at: string;    // ISO timestamp
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const GOALS_KEY = "autoappli_goals_v1";
const MIGRATION_FLAG_KEY = "autoappli_goals_migrated_v1";

// Stable SSR default — created once, never mutated.
const SSR_DEFAULT: GoalConfig = {
  weekly_target: 10,
  start_date: "1970-01-01",
  updated_at: new Date(0).toISOString(),
};

// ─── In-memory API cache (API-backed mode) ────────────────────────────────────
// Stable reference for useSyncExternalStore — invalidated on writes/fetches.

let _apiCache: GoalConfig | null = null;
let _apiFetchPromise: Promise<void> | null = null;

// localStorage mode snapshot cache — avoids infinite re-render loop in
// React 19 useSyncExternalStore by memoising the last-read value.
let _lsCache: GoalConfig | null = null;

// ─── Subscriber set ──────────────────────────────────────────────────────────

const _subscribers = new Set<() => void>();

function _notifySubscribers(): void {
  for (const cb of _subscribers) cb();
}

// ─── Mode detection ───────────────────────────────────────────────────────────

function _shouldUseApi(): boolean {
  if (typeof window === "undefined") return false;
  if (isDemoMode()) return false;
  return isJobsApiConfigured() && isSupabaseConfigured();
}

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

async function _useApiForCurrentUser(): Promise<boolean> {
  if (!_shouldUseApi()) return false;
  const token = await _getAccessToken();
  return token !== null;
}

// ─── API row → GoalConfig ─────────────────────────────────────────────────────

interface ApiGoalRow {
  weekly_target: number;
  start_date: string;
  updated_at: string;
}

function _apiRowToConfig(row: ApiGoalRow): GoalConfig {
  return {
    weekly_target: row.weekly_target ?? 10,
    start_date: row.start_date ?? "1970-01-01",
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

// ─── API cache refresh (async) ────────────────────────────────────────────────

function _refreshApiCache(): void {
  if (_apiFetchPromise) return;
  _apiFetchPromise = (async () => {
    try {
      const row = await apiGet<ApiGoalRow>("/goals");
      _apiCache = _apiRowToConfig(row);
    } catch {
      if (_apiCache === null) _apiCache = _buildDefault();
    } finally {
      _apiFetchPromise = null;
    }
    _notifySubscribers();
  })();
}

// ─── localStorage helpers (fallback mode) ────────────────────────────────────

function lsGet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(GOALS_KEY);
  } catch {
    return null;
  }
}

function lsSet(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GOALS_KEY, value);
    window.dispatchEvent(new StorageEvent("storage", { key: GOALS_KEY }));
  } catch {
    /* private browsing / quota — silently ignore */
  }
}

function _lastMonday(): string {
  const d = new Date();
  const offset = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function _buildDefault(): GoalConfig {
  return {
    weekly_target: 10,
    start_date: _lastMonday(),
    updated_at: new Date().toISOString(),
  };
}

function _isGoalConfig(v: unknown): v is GoalConfig {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.weekly_target === "number" &&
    typeof c.start_date === "string" &&
    typeof c.updated_at === "string"
  );
}

function _readFromLs(): GoalConfig {
  const raw = lsGet();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (_isGoalConfig(parsed)) return parsed;
    } catch {
      /* fall through */
    }
  }
  const config = _buildDefault();
  // Persist without dispatching — safe inside snapshot path.
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(GOALS_KEY, JSON.stringify(config));
    } catch {
      /* quota / private browsing */
    }
  }
  return config;
}

function _readFromLsCached(): GoalConfig {
  if (_lsCache !== null) return _lsCache;
  _lsCache = _readFromLs();
  return _lsCache;
}

// ─── Public read API ──────────────────────────────────────────────────────────

/**
 * Client-side snapshot for useSyncExternalStore.
 * In API mode: returns the in-memory cache (populated lazily).
 * In localStorage mode: returns localStorage contents (stable reference).
 */
export function getGoalConfigSnapshot(): GoalConfig {
  if (_shouldUseApi()) {
    if (_apiCache === null) {
      _refreshApiCache();
      return SSR_DEFAULT;
    }
    return _apiCache;
  }
  return _readFromLsCached();
}

/** SSR snapshot — always returns the stable placeholder. Never touches window. */
export function getGoalConfigServerSnapshot(): GoalConfig {
  return SSR_DEFAULT;
}

/**
 * Subscribe to goal config changes (storage events + API cache refreshes).
 * Compatible with useSyncExternalStore.
 */
export function subscribeGoalConfig(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  _subscribers.add(cb);

  const storageHandler = (e: StorageEvent) => {
    if (e.key === GOALS_KEY || e.key === null) {
      _lsCache = null;
      cb();
    }
  };
  window.addEventListener("storage", storageHandler);

  if (_shouldUseApi() && _apiCache === null) {
    _refreshApiCache();
  }

  return () => {
    _subscribers.delete(cb);
    window.removeEventListener("storage", storageHandler);
  };
}

// ─── Public write API ─────────────────────────────────────────────────────────

/**
 * Merge a partial update into the stored config.
 *
 * Optimistic: updates local state + notifies subscribers immediately, then
 * fires an async API write in the background when in API mode.
 */
export function setGoalConfig(partial: Partial<GoalConfig>): void {
  const now = new Date().toISOString();

  if (_shouldUseApi() && _apiCache !== null) {
    _apiCache = { ..._apiCache, ...partial, updated_at: now };
    _notifySubscribers();
    void _writeGoalToApi(partial);
    return;
  }

  // localStorage mode — also clears _lsCache so next snapshot re-reads.
  _lsCache = null;
  const current = _readFromLs();
  const next: GoalConfig = { ...current, ...partial, updated_at: now };
  lsSet(JSON.stringify(next));
}

async function _writeGoalToApi(partial: Partial<GoalConfig>): Promise<void> {
  try {
    if (!(await _useApiForCurrentUser())) return;
    const updated = await apiPatch<ApiGoalRow>("/goals", partial);
    _apiCache = _apiRowToConfig(updated);
    _notifySubscribers();
  } catch {
    // Optimistic value stays — next refresh will reconcile.
  }
}

// ─── Migration helpers ────────────────────────────────────────────────────────

/**
 * Returns true when localStorage has a config and the migration flag is absent.
 * Always false during SSR.
 */
export function hasUnmigratedLocalGoals(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === "true") return false;
    const raw = window.localStorage.getItem(GOALS_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    return _isGoalConfig(parsed);
  } catch {
    return false;
  }
}

/**
 * One-time migration: PATCHes the localStorage config to the API.
 * Sets `autoappli_goals_migrated_v1=true` afterward — subsequent calls
 * are no-ops. Returns true if migration was performed, false otherwise.
 */
export async function migrateLocalGoalsToCloud(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (window.localStorage.getItem(MIGRATION_FLAG_KEY) === "true") return false;
  } catch {
    return false;
  }

  if (!(await _useApiForCurrentUser())) return false;

  const raw = lsGet();
  let local: GoalConfig | null = null;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (_isGoalConfig(parsed)) local = parsed;
    } catch {
      /* ignore */
    }
  }

  if (local) {
    try {
      await apiPatch<ApiGoalRow>("/goals", {
        weekly_target: local.weekly_target,
        start_date: local.start_date,
      });
    } catch {
      // Best-effort — still mark as migrated to avoid repeated attempts.
    }
  }

  try {
    window.localStorage.setItem(MIGRATION_FLAG_KEY, "true");
  } catch {
    /* ignore */
  }

  // Invalidate API cache so fresh data is fetched next render.
  _apiCache = null;
  _refreshApiCache();

  return true;
}
