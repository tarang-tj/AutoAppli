/**
 * Pure filter function that takes the smart-filter state + ranked jobs and
 * returns the filtered + sorted slice to render.
 *
 * Kept pure and separate from the UI so it can be unit-tested and reused on
 * the backend path (currently only the frontend consumes it).
 */

import type { MatchResult, JobProfile } from "@/lib/match";
import type { SavedSearchFilters } from "@/lib/match/saved-searches";

export interface RankedJob {
  job: JobProfile;
  match: MatchResult;
  /** Whether the user has already applied — usually set by the caller from Supabase. */
  applied?: boolean;
}

export function applySmartFilters(ranked: RankedJob[], filters: SavedSearchFilters): RankedJob[] {
  const query = (filters.query ?? "").toLowerCase().trim();
  const skills = new Set(filters.skills ?? []);
  const remoteType = filters.remoteType ?? "any";
  const seniority = filters.seniority ?? null;
  const minSalary = filters.salaryMin ?? null;
  const hideApplied = Boolean(filters.hideApplied);
  const sortBy = filters.sortBy ?? "match";

  const filtered = ranked.filter(({ job, match, applied }) => {
    if (hideApplied && applied) return false;
    if (query) {
      const hay = `${job.title} ${job.company ?? ""} ${job.description ?? ""}`.toLowerCase();
      // Treat the query as OR of space-separated tokens; all tokens must hit somewhere
      const tokens = query.split(/\s+/).filter(Boolean);
      const allHit = tokens.every((t) => hay.includes(t));
      if (!allHit) return false;
    }
    if (remoteType !== "any" && job.remoteType && job.remoteType !== remoteType) return false;
    if (seniority && job.seniority && job.seniority !== seniority) return false;
    if (minSalary != null) {
      const ceiling = job.salaryMax ?? job.salaryMin ?? null;
      if (ceiling == null || ceiling < minSalary) return false;
    }
    if (skills.size > 0) {
      // Require at least one selected skill to appear in the job's skill set
      const jobSkills = new Set(match.matchedSkills.concat(match.missingSkills));
      let hit = false;
      for (const s of skills) if (jobSkills.has(s)) { hit = true; break; }
      if (!hit) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === "match") return b.match.scoreExact - a.match.scoreExact;
    if (sortBy === "recency") {
      const aTs = parsePostedAt(a.job.postedAt) ?? 0;
      const bTs = parsePostedAt(b.job.postedAt) ?? 0;
      return bTs - aTs;
    }
    if (sortBy === "salary") {
      const aSal = a.job.salaryMax ?? a.job.salaryMin ?? 0;
      const bSal = b.job.salaryMax ?? b.job.salaryMin ?? 0;
      return bSal - aSal;
    }
    return 0;
  });

  return filtered;
}

function parsePostedAt(p: string | number | null | undefined): number | null {
  if (p == null) return null;
  if (typeof p === "number") return p;
  const parsed = Date.parse(p);
  return Number.isNaN(parsed) ? null : parsed;
}
