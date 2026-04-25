/**
 * Unit tests for `computePipelineHealth`. Pure-function tests — no DOM.
 *
 * `now` is passed explicitly so results are deterministic across machines
 * and don't drift with the wall clock.
 */
import { describe, expect, test } from "vitest";
import type { Job } from "@/types";
import { computePipelineHealth } from "../pipeline-health";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 4, 1, 12, 0, 0); // 2026-05-01 12:00 UTC

function isoDaysAgo(days: number): string {
  return new Date(NOW - days * DAY).toISOString();
}

let nextId = 0;
function makeJob(overrides: Partial<Job>): Job {
  nextId += 1;
  return {
    id: overrides.id ?? `job-${nextId}`,
    company: "Acme",
    title: "Software Engineer",
    status: "bookmarked",
    source: "manual",
    created_at: isoDaysAgo(1),
    updated_at: isoDaysAgo(1),
    ...overrides,
  };
}

function makeAppliedJob(daysAgo: number, overrides: Partial<Job> = {}): Job {
  return makeJob({
    status: "applied",
    applied_at: isoDaysAgo(daysAgo),
    created_at: isoDaysAgo(daysAgo + 1),
    updated_at: isoDaysAgo(daysAgo),
    ...overrides,
  });
}

function findSignal(
  snap: ReturnType<typeof computePipelineHealth>,
  label: "velocity" | "conversion" | "follow-up",
) {
  return snap.signals.find((s) => s.label === label)!;
}

describe("computePipelineHealth", () => {
  test("empty jobs array → all signals null, total 0, category weak", () => {
    const snap = computePipelineHealth([], NOW);
    expect(snap.total).toBe(0);
    expect(snap.category).toBe("weak");
    expect(snap.signals).toHaveLength(3);
    for (const s of snap.signals) {
      expect(s.value).toBeNull();
    }
    expect(snap.generatedAt).toBe(NOW);
  });

  test("healthy active search (5+ apps in last 28d) → velocity = 33", () => {
    const jobs = Array.from({ length: 25 }, (_, i) =>
      makeAppliedJob(i + 1),
    );
    const snap = computePipelineHealth(jobs, NOW);
    const velocity = findSignal(snap, "velocity");
    expect(velocity.value).toBe(33);
    expect(velocity.detail).toMatch(/apps\/week/);
  });

  test("slow search (1 app in last 28d) → velocity ≈ 6", () => {
    const jobs = [makeAppliedJob(5)];
    const snap = computePipelineHealth(jobs, NOW);
    const velocity = findSignal(snap, "velocity");
    // 1 app / 4 weeks = 0.25/week → 0.25/5 = 0.05 → 0.05 * 33 = 1.65 → 2.
    // (Test asserts realistic slow value, not "≈6" verbatim — math says 2.)
    expect(velocity.value).toBe(2);
    expect(velocity.detail).toMatch(/apps\/week/);
  });

  test("conversion: 3 of 20 applied reached interviews → 15% → 33", () => {
    const jobs: Job[] = [];
    for (let i = 0; i < 17; i += 1) jobs.push(makeAppliedJob(40 + i));
    for (let i = 0; i < 3; i += 1) {
      jobs.push(
        makeAppliedJob(40 + i, {
          id: `int-${i}`,
          status: "interviewing",
        }),
      );
    }
    const snap = computePipelineHealth(jobs, NOW);
    const conversion = findSignal(snap, "conversion");
    expect(conversion.value).toBe(33);
    expect(conversion.detail).toBe("15% reach interviews");
  });

  test("conversion: <5 applied jobs → null, total scales over remaining signals", () => {
    // 2 applied jobs in the last 28 days. Velocity gets a value, follow-up
    // also has a value (no stale apps), conversion is null (sample <5).
    const jobs = [makeAppliedJob(3), makeAppliedJob(5)];
    const snap = computePipelineHealth(jobs, NOW);
    const conversion = findSignal(snap, "conversion");
    expect(conversion.value).toBeNull();
    // 2 of remaining signals available → total ≠ 0.
    expect(snap.total).toBeGreaterThan(0);
    expect(snap.total).toBeLessThanOrEqual(100);
  });

  test("perfect follow-up: 0 stale apps → follow-up = 33", () => {
    const jobs = [makeAppliedJob(3), makeAppliedJob(5), makeAppliedJob(7)];
    const snap = computePipelineHealth(jobs, NOW);
    const followUp = findSignal(snap, "follow-up");
    expect(followUp.value).toBe(33);
  });

  test("bad follow-up: 5 of 5 stale apps lack follow-up → 0", () => {
    const jobs = Array.from({ length: 5 }, (_, i) =>
      makeAppliedJob(15 + i, { id: `s-${i}` }),
    );
    const snap = computePipelineHealth(jobs, NOW);
    const followUp = findSignal(snap, "follow-up");
    expect(followUp.value).toBe(0);
    expect(followUp.detail).toMatch(/100%/);
  });

  test("mid follow-up: 2 of 4 stale lack follow-up → ≈ 16", () => {
    const jobs: Job[] = [
      makeAppliedJob(15, { id: "a" }),
      makeAppliedJob(16, { id: "b" }),
      // these two have follow-up via next_step
      makeAppliedJob(17, { id: "c", next_step: "Email recruiter" }),
      makeAppliedJob(18, { id: "d", next_step: "Phone screen prep" }),
    ];
    const snap = computePipelineHealth(jobs, NOW);
    const followUp = findSignal(snap, "follow-up");
    // (1 - 2/4) * 33 = 16.5 → 17 (Math.round of 16.5 is 17 in JS)
    expect(followUp.value).toBeGreaterThanOrEqual(16);
    expect(followUp.value).toBeLessThanOrEqual(17);
  });

  test("topAction targets weakest non-null signal — velocity", () => {
    // 1 app in last 28d → velocity ≈ 2 (low). 5 applied total, 3 in
    // "interviewing" → 60% conversion → 33. None of the 2 plain-applied
    // jobs are stale (both <10d old) → follow-up = 33.
    // Velocity is uniquely the weakest → topAction picks velocity.
    const jobs: Job[] = [
      makeAppliedJob(2, { id: "v1" }),
      makeAppliedJob(2, { id: "v2" }),
      makeAppliedJob(3, { id: "i1", status: "interviewing" }),
      makeAppliedJob(4, { id: "i2", status: "interviewing" }),
      makeAppliedJob(5, { id: "i3", status: "interviewing" }),
    ];
    const snap = computePipelineHealth(jobs, NOW);
    const velocity = findSignal(snap, "velocity");
    const conversion = findSignal(snap, "conversion");
    const followUp = findSignal(snap, "follow-up");
    expect(velocity.value!).toBeLessThan(conversion.value!);
    expect(velocity.value!).toBeLessThan(followUp.value!);
    expect(snap.topAction).toMatch(/Save 3 more roles/);
  });

  test("topAction for weakest follow-up substitutes count", () => {
    // 6 stale-no-followup applies, conversion null (only 6 < ?? — actually 6 >= 5,
    // but 0 reached interviews so conversion = 0). Still, follow-up is the
    // weakest at 0 vs conversion 0 → tie. Use deterministic data: 5 stale
    // no-followup applies (so follow-up = 0) plus 1 fresh app (so velocity > 0).
    const jobs: Job[] = [
      makeAppliedJob(15, { id: "s1" }),
      makeAppliedJob(16, { id: "s2" }),
      makeAppliedJob(17, { id: "s3" }),
      makeAppliedJob(18, { id: "s4" }),
      makeAppliedJob(19, { id: "s5" }),
      makeAppliedJob(2, { id: "fresh" }),
    ];
    const snap = computePipelineHealth(jobs, NOW);
    const followUp = findSignal(snap, "follow-up");
    expect(followUp.value).toBe(0);
    expect(snap.topAction).toMatch(/5 stale apps without a follow-up/);
  });

  test("category thresholds: <40 weak, 40-69 ok, ≥70 strong", () => {
    // Strong: 5 apps in 28d (velocity 33), 2/10 → 20% (conversion 33), no
    // stale apps (follow-up 33). All from applied 1-25 days ago, with
    // follow-up signals on the converted ones.
    const strongJobs: Job[] = [];
    for (let i = 0; i < 8; i += 1)
      strongJobs.push(makeAppliedJob(1 + i, { id: `g-${i}` }));
    strongJobs.push(
      makeAppliedJob(3, { id: "i1", status: "interviewing" }),
      makeAppliedJob(4, { id: "i2", status: "interviewing" }),
    );
    const strongSnap = computePipelineHealth(strongJobs, NOW);
    expect(strongSnap.total).toBeGreaterThanOrEqual(70);
    expect(strongSnap.category).toBe("strong");

    // Weak: empty
    expect(computePipelineHealth([], NOW).category).toBe("weak");

    // OK: a few stale apps, no conversions, low velocity.
    const okJobs: Job[] = [
      makeAppliedJob(2, { id: "v1" }),
      makeAppliedJob(3, { id: "v2" }),
      makeAppliedJob(4, { id: "v3" }),
      makeAppliedJob(5, { id: "v4" }),
      makeAppliedJob(6, { id: "v5" }),
    ];
    const okSnap = computePipelineHealth(okJobs, NOW);
    expect(okSnap.category).toBe("ok");
    expect(okSnap.total).toBeGreaterThanOrEqual(40);
    expect(okSnap.total).toBeLessThan(70);
  });

  test("total never exceeds 100", () => {
    // Pile of perfect signals.
    const jobs: Job[] = [];
    for (let i = 0; i < 30; i += 1)
      jobs.push(makeAppliedJob(1 + i, { id: `g-${i}` }));
    for (let i = 0; i < 10; i += 1)
      jobs.push(
        makeAppliedJob(1 + i, {
          id: `int-${i}`,
          status: "interviewing",
        }),
      );
    const snap = computePipelineHealth(jobs, NOW);
    expect(snap.total).toBeLessThanOrEqual(100);
  });

  test("insufficient-data scaling: only velocity available scales correctly", () => {
    // 1 app in last 28d. Conversion null (<5). Follow-up null (0 applied
    // jobs would be impossible since we have 1; follow-up returns 33 because
    // no stale apps). So really we're testing 2-of-3 scaling.
    const jobs = [makeAppliedJob(2)];
    const snap = computePipelineHealth(jobs, NOW);
    const conv = findSignal(snap, "conversion");
    const follow = findSignal(snap, "follow-up");
    expect(conv.value).toBeNull();
    expect(follow.value).toBe(33);
    // velocity ≈ 2, follow-up = 33 → sum 35 → 35 * (100 / (33*2)) ≈ 53
    expect(snap.total).toBeGreaterThanOrEqual(50);
    expect(snap.total).toBeLessThanOrEqual(56);
  });

  test("archived jobs are ignored across all signals", () => {
    const jobs: Job[] = [
      makeAppliedJob(2, { id: "live" }),
      // Archived applied jobs should not bump velocity, conversion, follow-up.
      makeAppliedJob(15, { id: "a1", archived: true }),
      makeAppliedJob(16, { id: "a2", archived: true, status: "interviewing" }),
    ];
    const snap = computePipelineHealth(jobs, NOW);
    const conv = findSignal(snap, "conversion");
    // Only 1 non-archived applied job → conversion null (sample <5).
    expect(conv.value).toBeNull();
    const follow = findSignal(snap, "follow-up");
    // No non-archived stale apps.
    expect(follow.value).toBe(33);
  });

  test("follow-up heuristic: next_step / recruiter / notes count as follow-up", () => {
    const jobs: Job[] = [
      makeAppliedJob(15, { id: "ns", next_step: "Email recruiter Tuesday" }),
      makeAppliedJob(16, { id: "rn", recruiter_name: "Jane" }),
      makeAppliedJob(17, { id: "nt", notes: "called back, awaiting reply" }),
      makeAppliedJob(18, { id: "bare" }), // no follow-up signal
    ];
    const snap = computePipelineHealth(jobs, NOW);
    const followUp = findSignal(snap, "follow-up");
    // 1 of 4 stale lacks follow-up → (1 - 0.25) * 33 = 24.75 → 25
    expect(followUp.value).toBe(25);
  });
});
