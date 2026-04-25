/**
 * Unit tests for `computeActionRadar`. Pure-function tests — no DOM.
 *
 * `now` is passed explicitly to every call so tests are deterministic and
 * don't drift with the wall clock.
 */
import { describe, expect, test } from "vitest";
import type { Job } from "@/types";
import { computeActionRadar } from "../action-radar";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 4, 1, 12, 0, 0); // 2026-05-01 12:00 UTC

function isoDaysFromNow(days: number): string {
  return new Date(NOW + days * DAY).toISOString();
}

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: overrides.id ?? "job-" + Math.random().toString(36).slice(2, 8),
    company: "Acme",
    title: "Software Engineer",
    status: "bookmarked",
    source: "manual",
    created_at: isoDaysFromNow(-1),
    updated_at: isoDaysFromNow(-1),
    ...overrides,
  };
}

describe("computeActionRadar", () => {
  test("empty jobs array returns empty snapshot", () => {
    const snap = computeActionRadar([], NOW);
    expect(snap.actions).toEqual([]);
    expect(snap.totalAvailable).toBe(0);
    expect(snap.generatedAt).toBe(NOW);
  });

  test("a single closing-soon job surfaces with high urgency", () => {
    const job = makeJob({
      id: "j1",
      status: "bookmarked",
      deadline: isoDaysFromNow(2),
    });
    const snap = computeActionRadar([job], NOW);
    expect(snap.actions).toHaveLength(1);
    const a = snap.actions[0];
    expect(a.id).toBe("j1");
    expect(a.type).toBe("closing-soon");
    expect(a.daysUntil).toBe(2);
    // 100 - 2*12 = 76
    expect(a.urgency).toBe(76);
    expect(a.ctaHref).toBe("/resume?jobId=j1");
    expect(a.reason).toMatch(/2d/);
  });

  test("multiple categories compete and order by urgency", () => {
    // closing-soon urgency: 100 - 0*12 = 100  (closing today)
    // follow-up   urgency: 40 + min(60, 12*3) = 76
    // prep       urgency: 60 + (4-1)*10 = 90 (interview tomorrow)
    const closing = makeJob({
      id: "c",
      company: "C",
      status: "bookmarked",
      deadline: isoDaysFromNow(0),
    });
    const follow = makeJob({
      id: "f",
      company: "F",
      status: "applied",
      applied_at: isoDaysFromNow(-12),
    });
    const prep = makeJob({
      id: "p",
      company: "P",
      status: "interviewing",
      next_step_date: isoDaysFromNow(1),
    });
    const snap = computeActionRadar([follow, prep, closing], NOW);
    expect(snap.actions.map((x) => x.id)).toEqual(["c", "p", "f"]);
    expect(snap.totalAvailable).toBe(3);
  });

  test("a job applied yesterday is NOT surfaced as follow-up", () => {
    const job = makeJob({
      id: "j",
      status: "applied",
      applied_at: isoDaysFromNow(-1),
    });
    const snap = computeActionRadar([job], NOW);
    expect(snap.actions).toEqual([]);
    expect(snap.totalAvailable).toBe(0);
  });

  test("a job applied 12 days ago surfaces as follow-up", () => {
    const job = makeJob({
      id: "j",
      status: "applied",
      applied_at: isoDaysFromNow(-12),
    });
    const snap = computeActionRadar([job], NOW);
    expect(snap.actions).toHaveLength(1);
    expect(snap.actions[0].type).toBe("follow-up");
    expect(snap.actions[0].daysSince).toBe(12);
    expect(snap.actions[0].ctaHref).toBe("/outreach?jobId=j");
    // 40 + min(60, 12*3=36) = 76
    expect(snap.actions[0].urgency).toBe(76);
  });

  test("past-deadline job still surfaces with urgency capped at 100", () => {
    const job = makeJob({
      id: "j",
      status: "bookmarked",
      deadline: isoDaysFromNow(-3),
    });
    const snap = computeActionRadar([job], NOW);
    expect(snap.actions).toHaveLength(1);
    expect(snap.actions[0].urgency).toBe(100);
    expect(snap.actions[0].daysUntil).toBe(-3);
    expect(snap.actions[0].reason).toMatch(/ago/);
  });

  test("interview tomorrow gives prep-interview urgency near 100", () => {
    const job = makeJob({
      id: "j",
      status: "interviewing",
      next_step_date: isoDaysFromNow(1),
    });
    const snap = computeActionRadar([job], NOW);
    expect(snap.actions).toHaveLength(1);
    expect(snap.actions[0].type).toBe("prep-interview");
    // 60 + (4-1)*10 = 90
    expect(snap.actions[0].urgency).toBe(90);
    expect(snap.actions[0].reason).toBe("Interview tomorrow");
  });

  test("interview today caps at urgency 100", () => {
    const job = makeJob({
      id: "j",
      status: "interviewing",
      next_step_date: isoDaysFromNow(0),
    });
    const snap = computeActionRadar([job], NOW);
    expect(snap.actions[0].urgency).toBe(100);
    expect(snap.actions[0].reason).toBe("Interview today");
  });

  test("more than 3 candidates returns top 3 + correct totalAvailable", () => {
    const jobs: Job[] = [
      makeJob({ id: "a", status: "bookmarked", deadline: isoDaysFromNow(0) }), // 100
      makeJob({ id: "b", status: "bookmarked", deadline: isoDaysFromNow(2) }), // 76
      makeJob({ id: "c", status: "bookmarked", deadline: isoDaysFromNow(5) }), // 40
      makeJob({ id: "d", status: "bookmarked", deadline: isoDaysFromNow(7) }), // 16
      makeJob({
        id: "e",
        status: "applied",
        applied_at: isoDaysFromNow(-15),
      }), // 40+min(60,45)=85
    ];
    const snap = computeActionRadar(jobs, NOW);
    expect(snap.totalAvailable).toBe(5);
    expect(snap.actions).toHaveLength(3);
    expect(snap.actions.map((x) => x.id)).toEqual(["a", "e", "b"]);
  });

  test("a job with no deadline / no applied_at / not interviewing is skipped", () => {
    const fresh = makeJob({
      id: "fresh",
      status: "bookmarked",
      created_at: isoDaysFromNow(-2), // < 14d threshold
    });
    const orphan = makeJob({
      id: "orphan",
      status: "rejected",
    });
    const snap = computeActionRadar([fresh, orphan], NOW);
    expect(snap.actions).toEqual([]);
    expect(snap.totalAvailable).toBe(0);
  });

  test("tie-break: closing-soon beats follow-up at equal urgency", () => {
    // Force equal urgency = 76:
    // closing-soon: deadline = +2d -> 100 - 24 = 76
    // follow-up:    applied = -12d -> 40 + min(60, 36) = 76
    const closing = makeJob({
      id: "c",
      status: "bookmarked",
      deadline: isoDaysFromNow(2),
    });
    const follow = makeJob({
      id: "f",
      status: "applied",
      applied_at: isoDaysFromNow(-12),
    });
    const snap = computeActionRadar([follow, closing], NOW);
    expect(snap.actions[0].urgency).toBe(76);
    expect(snap.actions[1].urgency).toBe(76);
    expect(snap.actions[0].id).toBe("c");
    expect(snap.actions[1].id).toBe("f");
  });

  test("archived and closed-out jobs are skipped entirely", () => {
    const archived = makeJob({
      id: "a",
      status: "applied",
      applied_at: isoDaysFromNow(-30),
      archived: true,
    });
    const closed = makeJob({
      id: "c",
      status: "applied",
      applied_at: isoDaysFromNow(-30),
      closed_at: isoDaysFromNow(-1),
      closed_reason: "rejected_by_company",
    });
    const live = makeJob({
      id: "live",
      status: "applied",
      applied_at: isoDaysFromNow(-12),
    });
    const snap = computeActionRadar([archived, closed, live], NOW);
    expect(snap.actions).toHaveLength(1);
    expect(snap.actions[0].id).toBe("live");
  });

  test("rolling-admission heuristic: bookmarked > 14d w/ no deadline surfaces", () => {
    const stale = makeJob({
      id: "stale",
      status: "bookmarked",
      created_at: isoDaysFromNow(-20),
    });
    const snap = computeActionRadar([stale], NOW);
    expect(snap.actions).toHaveLength(1);
    expect(snap.actions[0].type).toBe("closing-soon");
    expect(snap.actions[0].reason).toMatch(/Bookmarked/);
  });

  test("interviewing job with freeform next_step still surfaces", () => {
    const job = makeJob({
      id: "j",
      status: "interviewing",
      next_step: "Coffee chat with hiring manager",
    });
    const snap = computeActionRadar([job], NOW);
    expect(snap.actions).toHaveLength(1);
    expect(snap.actions[0].type).toBe("prep-interview");
    expect(snap.actions[0].scheduledFor).toBe("Coffee chat with hiring manager");
  });
});
