/**
 * Unit tests for the client-side facet filter.
 * Pure function — no DOM/React, no network.
 */
import { describe, it, expect } from "vitest";
import {
  filterResults,
  areFacetsDefault,
  hasSalaryData,
  maxSalaryInResults,
  DEFAULT_FACETS,
  type DiscoverFacets,
} from "../filter-results";
import type { CachedJob } from "@/types";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<CachedJob> = {}): CachedJob {
  return {
    id: "job-1",
    source: "greenhouse",
    external_id: "ext-1",
    title: "Software Engineer",
    company: "Acme",
    url: "https://example.com/job/1",
    description: "A great role",
    location: "New York, NY",
    remote_type: "remote",
    salary_min: 100_000,
    salary_max: 150_000,
    skills: ["typescript", "react"],
    tags: [],
    posted_at: "2026-04-01T00:00:00Z",
    first_seen_at: "2026-04-01T00:00:00Z",
    last_seen_at: "2026-04-01T00:00:00Z",
    inactive_at: null,
    ...overrides,
  };
}

const remoteJob = makeJob({ id: "j1", remote_type: "remote", source: "greenhouse" });
const hybridJob = makeJob({ id: "j2", remote_type: "hybrid", source: "lever" });
const onsiteJob = makeJob({ id: "j3", remote_type: "onsite", source: "indeed", salary_min: null, salary_max: null });
const internJob = makeJob({ id: "j4", title: "Software Engineering Intern", remote_type: "remote", source: "ashby", salary_min: 25_000, salary_max: 30_000 });
const seniorJob = makeJob({ id: "j5", title: "Senior Software Engineer", remote_type: "hybrid", source: "workable" });

const ALL_JOBS = [remoteJob, hybridJob, onsiteJob, internJob, seniorJob];

// ─── areFacetsDefault ──────────────────────────────────────────────────────────

describe("areFacetsDefault", () => {
  it("returns true for DEFAULT_FACETS", () => {
    expect(areFacetsDefault(DEFAULT_FACETS)).toBe(true);
  });

  it("returns false when remote is set", () => {
    expect(areFacetsDefault({ ...DEFAULT_FACETS, remote: "remote" })).toBe(false);
  });

  it("returns false when minSalary > 0", () => {
    expect(areFacetsDefault({ ...DEFAULT_FACETS, minSalary: 50_000 })).toBe(false);
  });

  it("returns false when levels has entries", () => {
    expect(areFacetsDefault({ ...DEFAULT_FACETS, levels: ["senior"] })).toBe(false);
  });

  it("returns false when sources has entries", () => {
    expect(areFacetsDefault({ ...DEFAULT_FACETS, sources: ["ats"] })).toBe(false);
  });
});

// ─── hasSalaryData / maxSalaryInResults ───────────────────────────────────────

describe("hasSalaryData", () => {
  it("true when any job has salary", () => {
    expect(hasSalaryData(ALL_JOBS)).toBe(true);
  });

  it("false when no job has salary", () => {
    expect(hasSalaryData([onsiteJob])).toBe(false);
  });
});

describe("maxSalaryInResults", () => {
  it("returns 0 for empty array", () => {
    expect(maxSalaryInResults([])).toBe(0);
  });

  it("picks the highest salary_max", () => {
    expect(maxSalaryInResults(ALL_JOBS)).toBe(150_000);
  });

  it("falls back to salary_min when salary_max is null", () => {
    const job = makeJob({ salary_min: 80_000, salary_max: null });
    expect(maxSalaryInResults([job])).toBe(80_000);
  });
});

// ─── filterResults — default (no-op) ─────────────────────────────────────────

describe("filterResults with DEFAULT_FACETS", () => {
  it("returns all jobs unchanged", () => {
    expect(filterResults(ALL_JOBS, DEFAULT_FACETS)).toHaveLength(ALL_JOBS.length);
  });

  it("returns empty array for empty input", () => {
    expect(filterResults([], DEFAULT_FACETS)).toHaveLength(0);
  });
});

// ─── Remote facet ────────────────────────────────────────────────────────────

describe("filterResults — remote facet", () => {
  it("filters to remote only", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, remote: "remote" });
    expect(result.map((j) => j.id)).toEqual(
      expect.arrayContaining(["j1", "j4"]),
    );
    expect(result.every((j) => j.remote_type === "remote")).toBe(true);
  });

  it("filters to hybrid only", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, remote: "hybrid" });
    expect(result.map((j) => j.id)).toEqual(
      expect.arrayContaining(["j2", "j5"]),
    );
  });

  it("filters to onsite only", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, remote: "onsite" });
    expect(result.map((j) => j.id)).toEqual(["j3"]);
  });

  it("excludes jobs with null remote_type when a specific type is chosen", () => {
    const nullJob = makeJob({ id: "jnull", remote_type: null });
    const result = filterResults([nullJob, remoteJob], { ...DEFAULT_FACETS, remote: "remote" });
    expect(result.map((j) => j.id)).toEqual(["j1"]);
  });
});

// ─── Salary facet ────────────────────────────────────────────────────────────

describe("filterResults — salary facet", () => {
  it("includes jobs meeting min salary threshold", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, minSalary: 100_000 });
    expect(result.map((j) => j.id)).toEqual(
      expect.arrayContaining(["j1", "j2", "j5"]),
    );
  });

  it("excludes jobs with no salary when minSalary > 0", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, minSalary: 1 });
    const ids = result.map((j) => j.id);
    expect(ids).not.toContain("j3"); // onsiteJob has no salary
  });

  it("excludes jobs below the threshold", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, minSalary: 120_000 });
    const ids = result.map((j) => j.id);
    expect(ids).not.toContain("j4"); // internJob max is 30k
  });
});

// ─── Level facet ────────────────────────────────────────────────────────────

describe("filterResults — level facet", () => {
  it("filters to intern", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, levels: ["intern"] });
    expect(result.map((j) => j.id)).toContain("j4");
    expect(result.every((j) => j.title.toLowerCase().includes("intern"))).toBe(true);
  });

  it("filters to senior", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, levels: ["senior"] });
    expect(result.map((j) => j.id)).toContain("j5");
  });

  it("returns multiple levels when multiple selected", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, levels: ["intern", "senior"] });
    const ids = result.map((j) => j.id);
    expect(ids).toContain("j4");
    expect(ids).toContain("j5");
  });

  it("mid is the default bucket for non-matched titles", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, levels: ["mid"] });
    const ids = result.map((j) => j.id);
    // j1 (Software Engineer), j2 (Software Engineer), j3 (Software Engineer) should be mid
    expect(ids).toContain("j1");
    expect(ids).toContain("j2");
    expect(ids).toContain("j3");
  });
});

// ─── Source facet ────────────────────────────────────────────────────────────

describe("filterResults — source facet", () => {
  it("filters to ats only", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, sources: ["ats"] });
    const sources = result.map((j) => j.source.toLowerCase());
    const ats = new Set(["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "weworkremotely"]);
    expect(sources.every((s) => ats.has(s))).toBe(true);
    expect(result.map((j) => j.id)).not.toContain("j3"); // indeed is scraper
  });

  it("filters to scraper only", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, sources: ["scraper"] });
    expect(result.map((j) => j.id)).toContain("j3");
    expect(result.map((j) => j.id)).not.toContain("j1"); // greenhouse is ats
  });

  it("returns both when both selected (same as any)", () => {
    const result = filterResults(ALL_JOBS, { ...DEFAULT_FACETS, sources: ["ats", "scraper"] });
    expect(result).toHaveLength(ALL_JOBS.length);
  });
});

// ─── Combined facets ─────────────────────────────────────────────────────────

describe("filterResults — combined facets", () => {
  it("applies all active facets as AND", () => {
    const facets: DiscoverFacets = {
      remote: "remote",
      minSalary: 50_000,
      levels: ["intern"],
      sources: ["ats"],
    };
    // Only j4 (intern, remote, ats=ashby, salary=30k) — but 30k < 50k, so 0 results
    const result = filterResults(ALL_JOBS, facets);
    expect(result).toHaveLength(0);
  });

  it("remote+ats returns jobs matching both", () => {
    const facets: DiscoverFacets = {
      remote: "remote",
      minSalary: 0,
      levels: [],
      sources: ["ats"],
    };
    const result = filterResults(ALL_JOBS, facets);
    // j1 (greenhouse, remote), j4 (ashby, remote)
    expect(result.map((j) => j.id)).toEqual(
      expect.arrayContaining(["j1", "j4"]),
    );
    expect(result.map((j) => j.id)).not.toContain("j3"); // indeed scraper
  });
});
