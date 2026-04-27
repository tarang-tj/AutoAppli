/**
 * Tests for frontend/src/lib/goals/storage.ts
 *
 * Covers:
 *   - localStorage mode: snapshot, setGoalConfig, subscribeGoalConfig
 *   - SSR safety: server snapshot returns stable placeholder
 *   - hasUnmigratedLocalGoals: true/false cases
 *   - migrateLocalGoalsToCloud: no-op when flag set, no-op when unauthenticated
 *   - API mode: cache population via subscribeGoalConfig, optimistic setGoalConfig
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// ── Hoisted mock variables (must use vi.hoisted to survive hoist to top) ──────
const mocks = vi.hoisted(() => ({
  isJobsApiConfigured: vi.fn(() => false),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  isSupabaseConfigured: vi.fn(() => false),
  // Return type widened to unknown so tests can override with authenticated sessions.
  createClient: vi.fn(
    (): unknown => ({
      auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
    }),
  ),
  isDemoMode: vi.fn(() => false),
}));

vi.mock("@/lib/api", () => ({
  isJobsApiConfigured: mocks.isJobsApiConfigured,
  apiGet: mocks.apiGet,
  apiPatch: mocks.apiPatch,
}));

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
  createClient: mocks.createClient,
}));

vi.mock("@/lib/demo-mode", () => ({
  isDemoMode: mocks.isDemoMode,
}));

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS_KEY = "autoappli_goals_v1";
const MIGRATION_FLAG = "autoappli_goals_migrated_v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function setLsGoals(config: object): void {
  localStorage.setItem(GOALS_KEY, JSON.stringify(config));
}

function clearGoalsStorage(): void {
  localStorage.removeItem(GOALS_KEY);
  localStorage.removeItem(MIGRATION_FLAG);
}

// Re-import storage module with fresh module-level state (_apiCache, _lsCache).
async function freshStorage() {
  vi.resetModules();
  return import("@/lib/goals/storage");
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage mode (no API configured)
// ─────────────────────────────────────────────────────────────────────────────

describe("localStorage mode", () => {
  beforeEach(() => {
    clearGoalsStorage();
    mocks.isJobsApiConfigured.mockReturnValue(false);
    mocks.isSupabaseConfigured.mockReturnValue(false);
    mocks.isDemoMode.mockReturnValue(false);
  });

  afterEach(() => {
    clearGoalsStorage();
  });

  test("getGoalConfigSnapshot returns default when localStorage is empty", async () => {
    const { getGoalConfigSnapshot } = await freshStorage();
    const cfg = getGoalConfigSnapshot();
    expect(cfg.weekly_target).toBe(10);
    expect(cfg.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof cfg.updated_at).toBe("string");
  });

  test("getGoalConfigSnapshot returns stable reference on repeated calls", async () => {
    const { getGoalConfigSnapshot } = await freshStorage();
    const a = getGoalConfigSnapshot();
    const b = getGoalConfigSnapshot();
    expect(a).toBe(b);
  });

  test("getGoalConfigSnapshot reads existing localStorage config", async () => {
    setLsGoals({ weekly_target: 5, start_date: "2026-01-05", updated_at: "2026-01-05T00:00:00Z" });
    const { getGoalConfigSnapshot } = await freshStorage();
    const cfg = getGoalConfigSnapshot();
    expect(cfg.weekly_target).toBe(5);
    expect(cfg.start_date).toBe("2026-01-05");
  });

  test("setGoalConfig persists update to localStorage", async () => {
    const { getGoalConfigSnapshot, setGoalConfig } = await freshStorage();
    setGoalConfig({ weekly_target: 20 });
    const raw = localStorage.getItem(GOALS_KEY);
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.weekly_target).toBe(20);
    const cfg = getGoalConfigSnapshot();
    expect(cfg.weekly_target).toBe(20);
  });

  test("setGoalConfig preserves untouched fields", async () => {
    setLsGoals({ weekly_target: 15, start_date: "2026-03-02", updated_at: "2026-03-02T00:00:00Z" });
    const { setGoalConfig, getGoalConfigSnapshot } = await freshStorage();
    setGoalConfig({ weekly_target: 25 });
    const cfg = getGoalConfigSnapshot();
    expect(cfg.weekly_target).toBe(25);
    expect(cfg.start_date).toBe("2026-03-02");
  });

  test("subscribeGoalConfig notifies on storage event", async () => {
    const { subscribeGoalConfig } = await freshStorage();
    const cb = vi.fn();
    const unsub = subscribeGoalConfig(cb);

    window.dispatchEvent(new StorageEvent("storage", { key: GOALS_KEY }));
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();
    window.dispatchEvent(new StorageEvent("storage", { key: GOALS_KEY }));
    expect(cb).toHaveBeenCalledTimes(1); // no more calls after unsub
  });

  test("subscribeGoalConfig ignores events for other keys", async () => {
    const { subscribeGoalConfig } = await freshStorage();
    const cb = vi.fn();
    const unsub = subscribeGoalConfig(cb);

    window.dispatchEvent(new StorageEvent("storage", { key: "some_other_key" }));
    expect(cb).not.toHaveBeenCalled();

    unsub();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SSR safety
// ─────────────────────────────────────────────────────────────────────────────

describe("getGoalConfigServerSnapshot", () => {
  test("returns stable SSR placeholder", async () => {
    const { getGoalConfigServerSnapshot } = await freshStorage();
    const a = getGoalConfigServerSnapshot();
    const b = getGoalConfigServerSnapshot();
    expect(a).toBe(b);
    expect(a.weekly_target).toBe(10);
    expect(a.start_date).toBe("1970-01-01");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hasUnmigratedLocalGoals
// ─────────────────────────────────────────────────────────────────────────────

describe("hasUnmigratedLocalGoals", () => {
  beforeEach(() => clearGoalsStorage());
  afterEach(() => clearGoalsStorage());

  test("returns false when localStorage is empty", async () => {
    const { hasUnmigratedLocalGoals } = await freshStorage();
    expect(hasUnmigratedLocalGoals()).toBe(false);
  });

  test("returns true when config exists and flag is absent", async () => {
    setLsGoals({ weekly_target: 10, start_date: "2026-01-05", updated_at: "2026-01-05T00:00:00Z" });
    const { hasUnmigratedLocalGoals } = await freshStorage();
    expect(hasUnmigratedLocalGoals()).toBe(true);
  });

  test("returns false when migration flag is already set", async () => {
    setLsGoals({ weekly_target: 10, start_date: "2026-01-05", updated_at: "2026-01-05T00:00:00Z" });
    localStorage.setItem(MIGRATION_FLAG, "true");
    const { hasUnmigratedLocalGoals } = await freshStorage();
    expect(hasUnmigratedLocalGoals()).toBe(false);
  });

  test("returns false for invalid JSON in localStorage", async () => {
    localStorage.setItem(GOALS_KEY, "not-json");
    const { hasUnmigratedLocalGoals } = await freshStorage();
    expect(hasUnmigratedLocalGoals()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// migrateLocalGoalsToCloud
// ─────────────────────────────────────────────────────────────────────────────

describe("migrateLocalGoalsToCloud", () => {
  beforeEach(() => {
    clearGoalsStorage();
    mocks.isJobsApiConfigured.mockReturnValue(false);
    mocks.isSupabaseConfigured.mockReturnValue(false);
    mocks.isDemoMode.mockReturnValue(false);
    mocks.apiPatch.mockResolvedValue({
      weekly_target: 10,
      start_date: "2026-01-05",
      updated_at: "2026-01-05T00:00:00Z",
    });
    mocks.apiGet.mockResolvedValue({
      weekly_target: 10,
      start_date: "2026-01-05",
      updated_at: "2026-01-05T00:00:00Z",
    });
  });

  afterEach(() => clearGoalsStorage());

  test("returns false when already migrated", async () => {
    localStorage.setItem(MIGRATION_FLAG, "true");
    const { migrateLocalGoalsToCloud } = await freshStorage();
    expect(await migrateLocalGoalsToCloud()).toBe(false);
  });

  test("returns false when user is not authenticated", async () => {
    setLsGoals({ weekly_target: 7, start_date: "2026-02-02", updated_at: "2026-02-02T00:00:00Z" });
    const { migrateLocalGoalsToCloud } = await freshStorage();
    expect(await migrateLocalGoalsToCloud()).toBe(false);
    expect(localStorage.getItem(MIGRATION_FLAG)).toBeNull();
  });

  test("sets migration flag and calls apiPatch on success", async () => {
    setLsGoals({ weekly_target: 7, start_date: "2026-02-02", updated_at: "2026-02-02T00:00:00Z" });
    mocks.isJobsApiConfigured.mockReturnValue(true);
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.createClient.mockReturnValue({
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { access_token: "tok123" } },
        })),
      },
    });

    const { migrateLocalGoalsToCloud } = await freshStorage();
    const result = await migrateLocalGoalsToCloud();
    expect(result).toBe(true);
    expect(localStorage.getItem(MIGRATION_FLAG)).toBe("true");
    expect(mocks.apiPatch).toHaveBeenCalledWith("/goals", {
      weekly_target: 7,
      start_date: "2026-02-02",
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API mode — cache population + optimistic writes
// ─────────────────────────────────────────────────────────────────────────────

describe("API mode", () => {
  beforeEach(() => {
    clearGoalsStorage();
    mocks.isJobsApiConfigured.mockReturnValue(true);
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.isDemoMode.mockReturnValue(false);
    mocks.createClient.mockReturnValue({
      auth: {
        getSession: vi.fn(async () => ({
          data: { session: { access_token: "tok_api" } },
        })),
      },
    });
    mocks.apiGet.mockResolvedValue({
      weekly_target: 12,
      start_date: "2026-04-07",
      updated_at: "2026-04-07T10:00:00Z",
    });
  });

  afterEach(() => clearGoalsStorage());

  test("getGoalConfigSnapshot returns SSR_DEFAULT while API fetch is in flight", async () => {
    const { getGoalConfigSnapshot } = await freshStorage();
    const cfg = getGoalConfigSnapshot(); // triggers fetch, cache not yet populated
    expect(cfg.weekly_target).toBe(10);
    expect(cfg.start_date).toBe("1970-01-01");
  });

  test("subscribeGoalConfig triggers API fetch and notifies on completion", async () => {
    const { subscribeGoalConfig, getGoalConfigSnapshot } = await freshStorage();
    const cb = vi.fn();
    const unsub = subscribeGoalConfig(cb);

    await vi.waitFor(() => expect(cb).toHaveBeenCalled());

    const cfg = getGoalConfigSnapshot();
    expect(cfg.weekly_target).toBe(12);
    expect(cfg.start_date).toBe("2026-04-07");

    unsub();
  });

  test("setGoalConfig in API mode optimistically updates cache and calls apiPatch", async () => {
    const { subscribeGoalConfig, setGoalConfig, getGoalConfigSnapshot } =
      await freshStorage();

    // Populate cache first.
    const cb = vi.fn();
    subscribeGoalConfig(cb);
    await vi.waitFor(() => expect(cb).toHaveBeenCalled());

    mocks.apiPatch.mockResolvedValue({
      weekly_target: 20,
      start_date: "2026-04-07",
      updated_at: "2026-04-07T11:00:00Z",
    });

    setGoalConfig({ weekly_target: 20 });

    // Optimistic update is synchronous.
    expect(getGoalConfigSnapshot().weekly_target).toBe(20);

    // apiPatch fires asynchronously.
    await vi.waitFor(() =>
      expect(mocks.apiPatch).toHaveBeenCalledWith("/goals", { weekly_target: 20 }),
    );
  });
});
