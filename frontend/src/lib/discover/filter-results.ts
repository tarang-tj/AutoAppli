/**
 * Pure client-side facet filter for already-loaded CachedJob results.
 *
 * No API calls — operates entirely on the in-memory results array so the
 * user gets instant feedback without a network round-trip.
 */
import type { CachedJob } from "@/types";

// ─── Facet filter shape ───────────────────────────────────────────────────────

export type RemoteFacet = "any" | "remote" | "hybrid" | "onsite";

export type LevelFacet = "intern" | "new_grad" | "mid" | "senior";

export type SourceFacet = "ats" | "scraper";

/** ATS sources considered "official" (direct postings, not scraped). */
const ATS_SOURCES = new Set([
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "weworkremotely",
]);

export interface DiscoverFacets {
  remote: RemoteFacet;
  /** 0 = any; positive number = minimum salary_min or salary_max */
  minSalary: number;
  levels: LevelFacet[];
  sources: SourceFacet[];
}

export const DEFAULT_FACETS: DiscoverFacets = {
  remote: "any",
  minSalary: 0,
  levels: [],
  sources: [],
};

// ─── Level detection heuristic ────────────────────────────────────────────────

const INTERN_RE = /\b(intern(ship)?|co[-\s]?op)\b/i;
const NEW_GRAD_RE = /\b(new[\s-]?grad|junior|jr\.?|entry[\s-]?level|associate)\b/i;
const SENIOR_RE = /\b(senior|sr\.?|lead|principal|staff|architect|director|vp|cto)\b/i;

function detectLevel(job: CachedJob): LevelFacet {
  const text = `${job.title} ${job.tags?.join(" ") ?? ""}`.toLowerCase();
  if (INTERN_RE.test(text)) return "intern";
  if (NEW_GRAD_RE.test(text)) return "new_grad";
  if (SENIOR_RE.test(text)) return "senior";
  return "mid";
}

// ─── Source classification ────────────────────────────────────────────────────

function classifySource(source: string): SourceFacet {
  return ATS_SOURCES.has(source.toLowerCase()) ? "ats" : "scraper";
}

// ─── Core filter function ────────────────────────────────────────────────────

/**
 * Returns the subset of `jobs` that pass every active facet.
 *
 * A facet is "inactive" when it's at its default value:
 *   - remote === "any"
 *   - minSalary === 0
 *   - levels.length === 0
 *   - sources.length === 0
 *
 * Inactive facets never filter anything out.
 */
export function filterResults(
  jobs: CachedJob[],
  facets: DiscoverFacets,
): CachedJob[] {
  return jobs.filter((job) => {
    // Remote type
    if (facets.remote !== "any") {
      if (job.remote_type !== facets.remote) return false;
    }

    // Salary
    if (facets.minSalary > 0) {
      const salary = job.salary_min ?? job.salary_max;
      if (!salary || salary < facets.minSalary) return false;
    }

    // Level
    if (facets.levels.length > 0) {
      const level = detectLevel(job);
      if (!facets.levels.includes(level)) return false;
    }

    // Source
    if (facets.sources.length > 0) {
      const src = classifySource(job.source);
      if (!facets.sources.includes(src)) return false;
    }

    return true;
  });
}

/** True when no facet is active (all at defaults). */
export function areFacetsDefault(facets: DiscoverFacets): boolean {
  return (
    facets.remote === "any" &&
    facets.minSalary === 0 &&
    facets.levels.length === 0 &&
    facets.sources.length === 0
  );
}

/** Utility: extract the max salary value present across a result set (for slider range). */
export function maxSalaryInResults(jobs: CachedJob[]): number {
  let max = 0;
  for (const j of jobs) {
    const s = j.salary_max ?? j.salary_min ?? 0;
    if (s > max) max = s;
  }
  return max;
}

/** True when at least one job in the set has a salary value. */
export function hasSalaryData(jobs: CachedJob[]): boolean {
  return jobs.some((j) => j.salary_min != null || j.salary_max != null);
}
