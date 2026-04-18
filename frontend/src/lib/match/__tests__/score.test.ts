/**
 * Unit tests for match scoring v2.
 *
 * Run with: `npx vitest run src/lib/match` (vitest is the default for Next.js
 * projects of this vintage) or any Jest-compatible runner.
 */

import { describe, expect, test } from "vitest";
import {
  scoreMatch,
  rankJobs,
  DEFAULT_WEIGHTS,
  type JobProfile,
  type CandidateProfile,
  toJobProfile,
  toCandidateProfile,
  weightsValid,
} from "../index";
import { extractSkills, parseSalary, detectRemoteType, extractYearsOfExperience } from "../extract";
import { normalizeSkill } from "../taxonomy";
import { parseResume } from "../resume-parser";
import { applySmartFilters } from "@/components/jobs/search-accuracy/apply-filters";

const BASE_JOB: JobProfile = {
  id: "j1",
  title: "Senior Software Engineer",
  company: "Acme",
  description: "Build scalable services in Python with FastAPI and PostgreSQL. AWS experience required.",
  location: "San Francisco, CA",
  skills: ["python", "fastapi", "postgresql", "aws"],
  seniority: "senior",
  remoteType: "hybrid",
  salaryMin: 150000,
  salaryMax: 200000,
  postedAt: new Date().toISOString(),
};

const BASE_CAND: CandidateProfile = {
  skills: ["python", "fastapi", "postgresql", "aws", "docker"],
  title: "Senior Backend Engineer",
  seniority: "senior",
  yearsOfExperience: 6,
  location: "San Francisco, CA",
  remotePreference: "hybrid",
  salaryTarget: 180000,
  resumeText: "",
};

describe("weights", () => {
  test("default weights sum to 1", () => {
    expect(weightsValid(DEFAULT_WEIGHTS)).toBe(true);
  });
});

describe("scoreMatch — strong candidate", () => {
  const result = scoreMatch(BASE_JOB, BASE_CAND);

  test("emits all 7 signals in fixed order", () => {
    expect(result.breakdown.map((b) => b.signal)).toEqual([
      "skills", "title", "seniority", "location", "remote", "recency", "salary",
    ]);
  });

  test("scores in the 'excellent' or 'strong' band", () => {
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test("marks all four job skills as matched", () => {
    expect(result.matchedSkills.sort()).toEqual(["aws", "fastapi", "postgresql", "python"]);
    expect(result.missingSkills).toEqual([]);
  });

  test("extra candidate skills show up in extraSkills", () => {
    expect(result.extraSkills).toContain("docker");
  });

  test("each breakdown row's points == raw * weight * 100", () => {
    for (const row of result.breakdown) {
      const expected = row.raw * row.weight * 100;
      expect(row.points).toBeCloseTo(expected, 6);
    }
  });
});

describe("scoreMatch — weak candidate", () => {
  const weak: CandidateProfile = {
    ...BASE_CAND,
    skills: ["php", "mysql"],
    title: "Junior PHP Developer",
    seniority: "junior",
    location: "Berlin, Germany",
    remotePreference: "onsite",
    salaryTarget: 300000,
  };
  const result = scoreMatch(BASE_JOB, weak);

  test("scores in the 'weak' or 'possible' band", () => {
    expect(result.score).toBeLessThan(55);
  });

  test("missing skills includes all four required", () => {
    expect(result.missingSkills.sort()).toEqual(["aws", "fastapi", "postgresql", "python"]);
  });

  test("seniority note explains the mismatch", () => {
    const seniorityRow = result.breakdown.find((b) => b.signal === "seniority");
    expect(seniorityRow?.note).toMatch(/junior/i);
  });
});

describe("scoreMatch — remote preferences", () => {
  test("exact remote match gets full remote signal", () => {
    const job = { ...BASE_JOB, remoteType: "remote" as const };
    const cand = { ...BASE_CAND, remotePreference: "remote" as const };
    const result = scoreMatch(job, cand);
    const remote = result.breakdown.find((b) => b.signal === "remote")!;
    expect(remote.raw).toBe(1);
  });

  test("remote candidate applying to onsite penalized", () => {
    const job = { ...BASE_JOB, remoteType: "onsite" as const };
    const cand = { ...BASE_CAND, remotePreference: "remote" as const };
    const result = scoreMatch(job, cand);
    const remote = result.breakdown.find((b) => b.signal === "remote")!;
    expect(remote.raw).toBeLessThanOrEqual(0.2);
  });

  test("hybrid↔remote is partial credit", () => {
    const job = { ...BASE_JOB, remoteType: "remote" as const };
    const cand = { ...BASE_CAND, remotePreference: "hybrid" as const };
    const result = scoreMatch(job, cand);
    const remote = result.breakdown.find((b) => b.signal === "remote")!;
    expect(remote.raw).toBeCloseTo(0.7, 2);
  });
});

describe("scoreMatch — salary", () => {
  test("target above range is excellent", () => {
    const cand = { ...BASE_CAND, salaryTarget: 140000 };
    const result = scoreMatch(BASE_JOB, cand);
    const salary = result.breakdown.find((b) => b.signal === "salary")!;
    expect(salary.raw).toBe(1);
  });

  test("target far above ceiling gets low score", () => {
    const cand = { ...BASE_CAND, salaryTarget: 400000 };
    const result = scoreMatch(BASE_JOB, cand);
    const salary = result.breakdown.find((b) => b.signal === "salary")!;
    expect(salary.raw).toBeLessThanOrEqual(0.3);
  });
});

describe("scoreMatch — recency", () => {
  test("fresh posting scores full", () => {
    const job = { ...BASE_JOB, postedAt: new Date().toISOString() };
    const result = scoreMatch(job, BASE_CAND);
    const recency = result.breakdown.find((b) => b.signal === "recency")!;
    expect(recency.raw).toBe(1);
  });

  test("60+ day posting is penalized", () => {
    const old = new Date();
    old.setDate(old.getDate() - 80);
    const job = { ...BASE_JOB, postedAt: old.toISOString() };
    const result = scoreMatch(job, BASE_CAND);
    const recency = result.breakdown.find((b) => b.signal === "recency")!;
    expect(recency.raw).toBeLessThanOrEqual(0.3);
  });
});

describe("rankJobs", () => {
  const jobs: JobProfile[] = [
    { ...BASE_JOB, id: "a", title: "Senior Software Engineer" },
    { ...BASE_JOB, id: "b", title: "Junior PHP Developer", skills: ["php", "mysql"], seniority: "junior" },
    { ...BASE_JOB, id: "c", title: "Senior ML Engineer", skills: ["python", "tensorflow", "aws"] },
  ];

  test("orders best match first", () => {
    const ranked = rankJobs(jobs, BASE_CAND);
    expect(ranked[0].job.id).toBe("a");
    expect(ranked[ranked.length - 1].job.id).toBe("b");
  });
});

describe("extractSkills", () => {
  test("pulls canonical names from JD prose", () => {
    const skills = extractSkills("We use React, Next.js, and TypeScript on the frontend. Backend is FastAPI + Postgres.");
    expect(skills).toContain("react");
    expect(skills).toContain("next.js");
    expect(skills).toContain("typescript");
    expect(skills).toContain("fastapi");
    expect(skills).toContain("postgresql");
  });

  test("handles aliases", () => {
    expect(extractSkills("k8s expertise required")).toContain("kubernetes");
    expect(extractSkills("Deep experience with JS and TS")).toEqual(expect.arrayContaining(["javascript", "typescript"]));
  });

  test("does NOT match skill substrings inside words", () => {
    // "rest" inside "interesting" should not match
    const skills = extractSkills("We want someone interesting.");
    expect(skills).not.toContain("rest");
  });
});

describe("normalizeSkill", () => {
  test("maps aliases to canonical", () => {
    expect(normalizeSkill("JS")).toBe("javascript");
    expect(normalizeSkill("react.js")).toBe("react");
    expect(normalizeSkill("K8S")).toBe("kubernetes");
    expect(normalizeSkill("PostgreSQL")).toBe("postgresql");
  });

  test("returns null for unknown skills", () => {
    expect(normalizeSkill("foobarbaz")).toBeNull();
  });
});

describe("parseSalary", () => {
  test("k-suffix range", () => {
    expect(parseSalary("$120k-150k")).toEqual({ min: 120000, max: 150000 });
    expect(parseSalary("$120K to $180K")).toEqual({ min: 120000, max: 180000 });
  });

  test("comma-separated range", () => {
    expect(parseSalary("$120,000 - $150,000")).toEqual({ min: 120000, max: 150000 });
  });

  test("single k-suffix", () => {
    expect(parseSalary("$150k")).toEqual({ min: 150000, max: 150000 });
  });

  test("no salary returns nulls", () => {
    expect(parseSalary("competitive compensation")).toEqual({ min: null, max: null });
  });
});

describe("detectRemoteType", () => {
  test("hybrid wins over remote when both appear", () => {
    expect(detectRemoteType("Hybrid role with remote flexibility")).toBe("hybrid");
  });

  test("remote-first phrasing", () => {
    expect(detectRemoteType("100% remote team")).toBe("remote");
    expect(detectRemoteType("work from home")).toBe("remote");
  });

  test("onsite phrasing", () => {
    expect(detectRemoteType("This is an on-site role in NYC")).toBe("onsite");
  });
});

describe("extractYearsOfExperience", () => {
  test("explicit years", () => {
    expect(extractYearsOfExperience("8+ years of experience")).toBe(8);
  });

  test("date ranges summed", () => {
    expect(extractYearsOfExperience("2019-2024 at Acme. 2016-2019 at Foo.")).toBeGreaterThanOrEqual(8);
  });

  test("empty returns 0", () => {
    expect(extractYearsOfExperience("")).toBe(0);
  });
});

describe("parseResume", () => {
  const RESUME = `
    Jane Doe
    Senior Software Engineer | Acme Inc
    Based in San Francisco, CA
    jane@example.com
    +1 555 123 4567

    Experience
    Senior Software Engineer at Acme Inc (2021-present)
      - Built services in Python, FastAPI, and PostgreSQL
      - Led k8s migration on AWS

    Software Engineer at Foo Corp (2018-2021)
      - Worked on React and TypeScript frontends

    Education
    B.S. Computer Science, Stanford University
  `;

  test("extracts canonical skills", () => {
    const parsed = parseResume(RESUME);
    expect(parsed.skills).toEqual(expect.arrayContaining([
      "python", "fastapi", "postgresql", "kubernetes", "aws", "react", "typescript",
    ]));
  });

  test("detects senior seniority", () => {
    const parsed = parseResume(RESUME);
    expect(parsed.seniority).toBe("senior");
  });

  test("computes years of experience from date ranges", () => {
    const parsed = parseResume(RESUME);
    expect(parsed.yearsOfExperience).toBeGreaterThanOrEqual(6);
  });

  test("captures education line", () => {
    const parsed = parseResume(RESUME);
    expect(parsed.education.join(" ")).toMatch(/Stanford/);
  });
});

describe("adapters", () => {
  test("toJobProfile maps snake_case fields", () => {
    const jp = toJobProfile({
      title: "Staff Engineer",
      company: "Foo",
      description: "Build on Python and AWS.",
      salary_min: 200000,
      salary_max: 260000,
      remote_type: "remote",
    });
    expect(jp.salaryMin).toBe(200000);
    expect(jp.salaryMax).toBe(260000);
    expect(jp.remoteType).toBe("remote");
    expect(jp.skills).toEqual(expect.arrayContaining(["python", "aws"]));
  });

  test("toCandidateProfile extracts skills from resume text", () => {
    const cp = toCandidateProfile({
      resume_text: "Worked with React and TypeScript",
    });
    expect(cp.skills).toEqual(expect.arrayContaining(["react", "typescript"]));
  });
});

describe("applySmartFilters", () => {
  function mk(id: string, score: number, overrides: Partial<JobProfile> = {}, applied = false) {
    const job: JobProfile = { ...BASE_JOB, id, ...overrides };
    return {
      job,
      applied,
      match: {
        score,
        scoreExact: score,
        breakdown: [],
        matchedSkills: job.skills ?? [],
        missingSkills: [],
        extraSkills: [],
        headline: "",
      },
    };
  }

  test("hideApplied removes applied jobs", () => {
    const ranked = [mk("a", 90), mk("b", 80, {}, true), mk("c", 70)];
    const out = applySmartFilters(ranked, { hideApplied: true });
    expect(out.map((r) => r.job.id)).toEqual(["a", "c"]);
  });

  test("remoteType filters correctly", () => {
    const ranked = [
      mk("a", 90, { remoteType: "remote" }),
      mk("b", 80, { remoteType: "onsite" }),
    ];
    const out = applySmartFilters(ranked, { remoteType: "remote" });
    expect(out.map((r) => r.job.id)).toEqual(["a"]);
  });

  test("query tokens must all match", () => {
    const ranked = [
      mk("a", 90, { title: "Senior Python Engineer" }),
      mk("b", 80, { title: "Rust Staff Engineer" }),
    ];
    const out = applySmartFilters(ranked, { query: "python senior" });
    expect(out.map((r) => r.job.id)).toEqual(["a"]);
  });

  test("minSalary filters below-range jobs", () => {
    const ranked = [
      mk("a", 90, { salaryMin: 150000, salaryMax: 200000 }),
      mk("b", 80, { salaryMin: 80000, salaryMax: 100000 }),
    ];
    const out = applySmartFilters(ranked, { salaryMin: 120000 });
    expect(out.map((r) => r.job.id)).toEqual(["a"]);
  });

  test("sort by recency", () => {
    const now = Date.now();
    const ranked = [
      mk("a", 70, { postedAt: now - 7 * 86400 * 1000 }),
      mk("b", 99, { postedAt: now - 1000 }),
    ];
    const out = applySmartFilters(ranked, { sortBy: "recency" });
    expect(out.map((r) => r.job.id)).toEqual(["b", "a"]);
  });
});
