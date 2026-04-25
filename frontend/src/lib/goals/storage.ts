/**
 * Goal Tracker — localStorage persistence layer.
 *
 * Stores the user's weekly application target and streak start date.
 * v1 lives in localStorage only; the versioned key (`autoappli_goals_v1`)
 * keeps a future Supabase migration clean (same pattern as Story Library).
 *
 * SSR safety: every helper guards on `typeof window` and falls back to a
 * default config on the server. `getGoalConfigServerSnapshot` is the
 * canonical SSR snapshot for `useSyncExternalStore`.
 *
 * Same-tab notification: `setGoalConfig` dispatches a `StorageEvent` so
 * subscribers re-snapshot immediately. The native `storage` event only fires
 * across tabs.
 *
 * Cache contract: `getGoalConfigSnapshot` MUST return a stable object
 * reference between storage events so React 19's `useSyncExternalStore`
 * does not loop. The module-level `_cache` variable satisfies this.
 */

export const GOALS_KEY = "autoappli_goals_v1";

export type GoalConfig = {
  weekly_target: number;  // default 10
  start_date: string;     // ISO yyyy-mm-dd; default = first Monday on or before today
  updated_at: string;     // ISO timestamp
};

// Module-level cache — stable reference between storage events.
let _cache: GoalConfig | null = null;

// Stable SSR default — created once, never mutated.
const SSR_DEFAULT: GoalConfig = {
  weekly_target: 10,
  start_date: "1970-01-01", // stable placeholder; replaced on hydration
  updated_at: new Date(0).toISOString(),
};

/** First Monday on or before today (local time). */
function lastMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const offset = day === 0 ? 6 : day - 1; // days since Monday
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function buildDefault(): GoalConfig {
  return {
    weekly_target: 10,
    start_date: lastMonday(),
    updated_at: new Date().toISOString(),
  };
}

function isGoalConfig(v: unknown): v is GoalConfig {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.weekly_target === "number" &&
    typeof c.start_date === "string" &&
    typeof c.updated_at === "string"
  );
}

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
    // Dispatch storage event so cross-tab + same-tab subscribers wake up.
    // This is NOT called from inside getGoalConfigSnapshot to avoid
    // triggering infinite re-renders in useSyncExternalStore (React 19).
    window.dispatchEvent(new StorageEvent("storage", { key: GOALS_KEY }));
  } catch {
    /* private browsing / quota — silently ignore */
  }
}

/** Invalidate the in-memory cache so the next snapshot read re-parses localStorage. */
function invalidateCache(): void {
  _cache = null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Returns current config from the in-memory cache (stable reference).
 * On cache miss, reads from localStorage and populates the cache.
 * Does NOT write to localStorage or dispatch events — safe to call
 * inside `useSyncExternalStore` snapshot getters (React 19 requirement).
 */
export function getGoalConfigSnapshot(): GoalConfig {
  if (_cache !== null) return _cache;

  const raw = lsGet();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isGoalConfig(parsed)) {
        _cache = parsed;
        return _cache;
      }
    } catch {
      /* fall through to default */
    }
  }

  // First run: build a default but write it outside the snapshot path
  // to avoid the StorageEvent → subscriber → snapshot → StorageEvent loop.
  const config = buildDefault();
  _cache = config;
  // Persist without dispatching an event (use raw localStorage directly).
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(GOALS_KEY, JSON.stringify(config));
    } catch {
      /* quota / private browsing */
    }
  }
  return _cache;
}

/** SSR-safe snapshot — never touches `window`. Returns the same object every call. */
export function getGoalConfigServerSnapshot(): GoalConfig {
  return SSR_DEFAULT;
}

/** Subscribe to goal config changes (storage events, same-tab or cross-tab). */
export function subscribeGoalConfig(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === GOALS_KEY || e.key === null) {
      invalidateCache();
      callback();
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Merge a partial update into the stored config and persist it. */
export function setGoalConfig(partial: Partial<GoalConfig>): void {
  const current = getGoalConfigSnapshot();
  const next: GoalConfig = {
    ...current,
    ...partial,
    updated_at: new Date().toISOString(),
  };
  invalidateCache();
  lsSet(JSON.stringify(next));
}
