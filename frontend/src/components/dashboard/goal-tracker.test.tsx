/**
 * Tests for GoalTracker dashboard widget.
 *
 * Strategy:
 *   - Mock localStorage + storage module to control config.
 *   - Use real date math but freeze "now" via vi.setSystemTime.
 *   - Cover: default empty state, current-week counting, streak,
 *     edit dialog round-trip, and SSR snapshot safety.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Job } from "@/types";

// ── localStorage stub ────────────────────────────────────────────────────

const store: Record<string, string> = {};
const mockStorage = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
  removeItem: vi.fn((k: string) => { delete store[k]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockStorage,
  writable: true,
});

// ── Helpers ──────────────────────────────────────────────────────────────

/** Monday of the week containing the given date (local time). */
function weekMonday(d: Date): Date {
  const day = d.getDay();
  const offset = day === 0 ? 6 : day - 1;
  const m = new Date(d);
  m.setDate(m.getDate() - offset);
  m.setHours(0, 0, 0, 0);
  return m;
}

function makeJob(createdAt: string, overrides: Partial<Job> = {}): Job {
  return {
    id: `job-${Math.random().toString(36).slice(2)}`,
    company: "Acme",
    title: "Engineer",
    status: "bookmarked",
    source: "manual",
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

/** ISO string for a datetime N days offset from the given base. */
function daysOffset(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── Test suite ───────────────────────────────────────────────────────────

describe("GoalTracker", () => {
  // Fix "now" to a known Wednesday so week arithmetic is deterministic.
  // 2026-04-22 is a Wednesday.
  const NOW = new Date("2026-04-22T10:00:00.000Z");
  const THIS_MONDAY = weekMonday(new Date("2026-04-22T10:00:00+00:00"));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mockStorage.clear();
    // Seed a known config so tests don't fight over defaults.
    store["autoappli_goals_v1"] = JSON.stringify({
      weekly_target: 10,
      start_date: "2026-01-06", // a past Monday
      updated_at: new Date(0).toISOString(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders with default goal and zero progress when jobs is empty", async () => {
    const { GoalTracker } = await import("./goal-tracker");
    render(<GoalTracker jobs={[]} />);

    expect(screen.getByTestId("goal-tracker")).toBeInTheDocument();
    // Big number should show 0
    expect(screen.getByLabelText(/0 of 10 applications this week/i)).toBeInTheDocument();
    // Weekly label
    expect(screen.getByText(/\/ 10 this week/i)).toBeInTheDocument();
    // No streak yet
    expect(screen.getByText(/start your streak/i)).toBeInTheDocument();
  });

  it("counts only jobs created in the current ISO week", async () => {
    const { GoalTracker } = await import("./goal-tracker");

    // THIS_MONDAY is the Monday of the week containing NOW (2026-04-22).
    // Build jobs: 3 this week, 2 last week.
    const thisWeekJobs = [
      makeJob(daysOffset(THIS_MONDAY, 0)),  // Monday
      makeJob(daysOffset(THIS_MONDAY, 1)),  // Tuesday
      makeJob(daysOffset(THIS_MONDAY, 2)),  // Wednesday (today)
    ];
    const lastWeekJobs = [
      makeJob(daysOffset(THIS_MONDAY, -7)), // last Monday
      makeJob(daysOffset(THIS_MONDAY, -6)), // last Tuesday
    ];

    render(<GoalTracker jobs={[...thisWeekJobs, ...lastWeekJobs]} />);

    expect(screen.getByLabelText(/3 of 10 applications this week/i)).toBeInTheDocument();
  });

  it("shows a streak when prior weeks hit the target", async () => {
    const { GoalTracker } = await import("./goal-tracker");

    // We need: this week >= 10, last 2 weeks >= 10.
    const jobs: Job[] = [];
    for (let week = 0; week <= 2; week++) {
      for (let app = 0; app < 10; app++) {
        jobs.push(makeJob(daysOffset(THIS_MONDAY, -week * 7 + app * 0)));
      }
    }

    render(<GoalTracker jobs={jobs} />);

    // Streak should be at least 1 (current week) if this week >= 10.
    const streakEl = screen.queryByText(/\d+-week streak/i);
    expect(streakEl).not.toBeNull();
  });

  it("does not show streak when current week is below target", async () => {
    const { GoalTracker } = await import("./goal-tracker");

    // Only 5 jobs this week (below target of 10).
    const jobs = Array.from({ length: 5 }, (_, i) =>
      makeJob(daysOffset(THIS_MONDAY, i % 5)),
    );

    render(<GoalTracker jobs={jobs} />);

    expect(screen.getByText(/start your streak/i)).toBeInTheDocument();
    expect(screen.queryByText(/\d+-week streak/i)).toBeNull();
  });

  it("edit dialog opens, updates goal, re-renders with new target", async () => {
    // Use real timers for this test: @base-ui/react Dialog uses rAF/timers
    // internally for animations; fake timers deadlock the portal mount.
    vi.useRealTimers();
    const user = userEvent.setup();
    const { GoalTracker } = await import("./goal-tracker");

    render(<GoalTracker jobs={[]} />);

    // Open dialog
    const editBtn = screen.getByTestId("goal-tracker-edit");
    await user.click(editBtn);

    // Dialog should appear with current target value
    const input = await screen.findByLabelText(/weekly application target/i, {}, { timeout: 3000 });
    expect(input).toBeInTheDocument();

    // Change to 20
    await user.clear(input);
    await user.type(input, "20");

    // Save
    await user.click(screen.getByRole("button", { name: /save/i }));

    // After save, widget should show new target
    await waitFor(() => {
      expect(screen.queryByText(/\/ 20 this week/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  }, 10000);

  it("shows the edit button with the correct data-testid", async () => {
    const { GoalTracker } = await import("./goal-tracker");
    render(<GoalTracker jobs={[]} />);
    expect(screen.getByTestId("goal-tracker-edit")).toBeInTheDocument();
  });

  it("renders projection text for non-empty jobs", async () => {
    const { GoalTracker } = await import("./goal-tracker");

    // 5 jobs this week, pace > 0 → projection should mention a date or milestone
    const jobs = Array.from({ length: 5 }, (_, i) =>
      makeJob(daysOffset(THIS_MONDAY, i % 5)),
    );

    render(<GoalTracker jobs={jobs} />);

    // Should NOT show the zero-pace fallback
    expect(screen.queryByText(/set a goal to see projection/i)).toBeNull();
    // Should show "On pace to hit…" text
    expect(screen.getByText(/on pace to hit \d+ apps by/i)).toBeInTheDocument();
  });

  it("shows zero-pace projection fallback when jobs is empty", async () => {
    const { GoalTracker } = await import("./goal-tracker");
    render(<GoalTracker jobs={[]} />);
    expect(screen.getByText(/set a goal to see projection/i)).toBeInTheDocument();
  });
});

// ── SSR snapshot safety ──────────────────────────────────────────────────

describe("getGoalConfigServerSnapshot", () => {
  it("does not access window", async () => {
    const { getGoalConfigServerSnapshot } = await import("@/lib/goals/storage");

    // Temporarily remove window to simulate SSR environment.
    const savedWindow = globalThis.window;
    // @ts-expect-error - intentional SSR simulation
    delete globalThis.window;

    let result: ReturnType<typeof getGoalConfigServerSnapshot> | undefined;
    let threw = false;
    try {
      result = getGoalConfigServerSnapshot();
    } catch {
      threw = true;
    }

    // Restore window before any assertions (jest-dom needs it).
    globalThis.window = savedWindow;

    expect(threw).toBe(false);
    expect(result).toBeDefined();
    expect(result!.weekly_target).toBe(10);
    expect(typeof result!.start_date).toBe("string");
  });
});
