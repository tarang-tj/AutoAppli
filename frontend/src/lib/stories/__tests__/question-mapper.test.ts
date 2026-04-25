/**
 * Tests for the tag-driven question mapper.
 *
 * Run with `npx vitest run src/lib/stories/__tests__/question-mapper`.
 */
import { describe, expect, test, vi } from "vitest";

import type { Story } from "@/lib/stories/storage";
import { mapStoryToQuestions } from "@/lib/stories/question-mapper";

function story(partial: Partial<Story> & { tags: Story["tags"] }): Story {
  return {
    id: partial.id ?? "test-id",
    title: partial.title ?? "Test story",
    tags: partial.tags,
    situation: partial.situation ?? "",
    task: partial.task ?? "",
    action: partial.action ?? "",
    result: partial.result ?? "",
    createdAt: partial.createdAt ?? 0,
    updatedAt: partial.updatedAt ?? 0,
  };
}

describe("mapStoryToQuestions", () => {
  test("returns up to 5 questions for a single-tag story", () => {
    const out = mapStoryToQuestions(story({ tags: ["leadership"] }));
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(5);
    for (const q of out) {
      expect(q.matchedTags).toEqual(["leadership"]);
    }
  });

  test("max parameter caps the result count", () => {
    const out = mapStoryToQuestions(story({ tags: ["leadership"] }), 2);
    expect(out).toHaveLength(2);
  });

  test("max <= 0 returns []", () => {
    expect(mapStoryToQuestions(story({ tags: ["leadership"] }), 0)).toEqual([]);
  });

  test("a story with no tags returns []", () => {
    expect(mapStoryToQuestions(story({ tags: [] }))).toEqual([]);
  });

  test("two-tag story prefers questions covered by both tags", () => {
    const out = mapStoryToQuestions(
      story({ tags: ["leadership", "conflict"] }),
      5,
    );
    expect(out.length).toBeGreaterThan(0);
    // The top-ranked entry must hit BOTH tags — that's the whole point
    // of cross-tag preference.
    expect(out[0].matchedTags.sort()).toEqual(["conflict", "leadership"]);
  });

  test("results are deduped by question text", () => {
    const out = mapStoryToQuestions(
      story({ tags: ["leadership", "conflict", "teamwork"] }),
      20,
    );
    const seen = new Set<string>();
    for (const q of out) {
      const key = q.question.toLowerCase();
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test("matchedTags only contains tags present on the story", () => {
    const tags: Story["tags"] = ["technical", "deadline"];
    const out = mapStoryToQuestions(story({ tags }), 10);
    for (const q of out) {
      for (const t of q.matchedTags) {
        expect(tags).toContain(t);
      }
    }
  });

  test("pure: does not read localStorage or wall-clock time", () => {
    const lsSpy = vi.spyOn(window.localStorage.__proto__, "getItem");
    const dateSpy = vi.spyOn(Date, "now");
    mapStoryToQuestions(story({ tags: ["leadership", "creativity"] }));
    expect(lsSpy).not.toHaveBeenCalled();
    expect(dateSpy).not.toHaveBeenCalled();
    lsSpy.mockRestore();
    dateSpy.mockRestore();
  });

  test("output is stable across calls (deterministic)", () => {
    const s = story({ tags: ["technical", "ownership"] });
    const a = mapStoryToQuestions(s);
    const b = mapStoryToQuestions(s);
    expect(a).toEqual(b);
  });
});
