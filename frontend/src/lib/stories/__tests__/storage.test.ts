/**
 * Tests for the Story Library localStorage layer.
 *
 * Run with `npx vitest run src/lib/stories/__tests__/storage`.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  STORIES_KEY,
  deleteStory,
  getStoriesSnapshot,
  readStories,
  subscribeStories,
  writeStory,
} from "@/lib/stories/storage";

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  test("readStories returns [] when localStorage is empty", () => {
    expect(readStories()).toEqual([]);
  });

  test("readStories returns [] when localStorage holds garbage", () => {
    window.localStorage.setItem(STORIES_KEY, "not-json{");
    expect(readStories()).toEqual([]);
  });

  test("writeStory creates a new story when no id is given", () => {
    const created = writeStory({
      title: "Refactored a flaky CI pipeline",
      tags: ["technical", "ownership"],
      situation: "Builds were red 40% of the time.",
      task: "Find the flake and fix it.",
      action: "Bisected, isolated the race, added a lock.",
      result: "CI green for two months straight.",
    });
    expect(created.id).toMatch(/.+/);
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBe(created.createdAt);
    expect(readStories()).toHaveLength(1);
    expect(readStories()[0].title).toBe("Refactored a flaky CI pipeline");
  });

  test("writeStory updates an existing story by id and bumps updatedAt", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const initial = writeStory({
      title: "Initial title",
      tags: ["leadership"],
      situation: "s",
      task: "t",
      action: "a",
      result: "r",
    });

    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
    const updated = writeStory({
      id: initial.id,
      title: "Updated title",
      tags: ["leadership", "conflict"],
      situation: "s2",
      task: "t2",
      action: "a2",
      result: "r2",
    });

    expect(updated.id).toBe(initial.id);
    expect(updated.title).toBe("Updated title");
    expect(updated.tags).toEqual(["leadership", "conflict"]);
    expect(updated.createdAt).toBe(initial.createdAt);
    expect(updated.updatedAt).toBeGreaterThan(initial.updatedAt);
    // No duplicate row.
    expect(readStories()).toHaveLength(1);
  });

  test("writeStory with an unknown id creates a new row (does not error)", () => {
    const created = writeStory({
      id: "does-not-exist",
      title: "Adopted",
      tags: ["technical"],
      situation: "s",
      task: "t",
      action: "a",
      result: "r",
    });
    // Adopt the id rather than minting a new one — keeps callers stable.
    expect(created.id).toBe("does-not-exist");
    expect(readStories()).toHaveLength(1);
  });

  test("deleteStory removes the matching row", () => {
    const a = writeStory({
      title: "A",
      tags: ["technical"],
      situation: "s",
      task: "t",
      action: "a",
      result: "r",
    });
    const b = writeStory({
      title: "B",
      tags: ["leadership"],
      situation: "s",
      task: "t",
      action: "a",
      result: "r",
    });
    deleteStory(a.id);
    const remaining = readStories();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
  });

  test("subscribeStories notifies subscribers on write and on delete", () => {
    const cb = vi.fn();
    const unsubscribe = subscribeStories(cb);

    const created = writeStory({
      title: "Subscribed",
      tags: ["technical"],
      situation: "s",
      task: "t",
      action: "a",
      result: "r",
    });
    expect(cb).toHaveBeenCalled();

    cb.mockClear();
    deleteStory(created.id);
    expect(cb).toHaveBeenCalled();

    unsubscribe();
    cb.mockClear();
    writeStory({
      title: "After unsubscribe",
      tags: ["technical"],
      situation: "s",
      task: "t",
      action: "a",
      result: "r",
    });
    expect(cb).not.toHaveBeenCalled();
  });

  test("v1 storage key isolates data from a future v2 namespace", () => {
    // Pre-seed something under a hypothetical v2 key — readStories must ignore it.
    window.localStorage.setItem(
      "autoappli_stories_v2",
      JSON.stringify([{ id: "v2", title: "v2 row" }]),
    );
    expect(readStories()).toEqual([]);
    expect(STORIES_KEY).toBe("autoappli_stories_v1");
  });

  test("getStoriesSnapshot mirrors readStories", () => {
    writeStory({
      title: "Snapshot",
      tags: ["technical"],
      situation: "s",
      task: "t",
      action: "a",
      result: "r",
    });
    expect(getStoriesSnapshot()).toEqual(readStories());
  });
});
