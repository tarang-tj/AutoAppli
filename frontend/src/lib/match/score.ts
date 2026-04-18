/**
 * Match scoring v2 — weighted multi-signal with explainable breakdown.
 *
 * Design goals (vs the legacy TF-IDF `computeDemoMatchScore` in api.ts):
 *   1. Deterministic, pure function — easy to unit test.
 *   2. Multi-signal — skills aren't the only thing that matters.
 *   3. Explainable — every match returns a breakdown showing which signals
 *      contributed how much. Used for the fit-badge hover tooltip and for
 *      the "why was this ranked low?" UX.
 *   4. Mirrored in Python (backend/app/services/match_v2.py) with identical
 *      weights so both paths produce the same number.
 */

import {
  DEFAULT_WEIGHTS,
  type CandidateProfile,
  type JobProfile,
  type MatchResult,
  type ScoringWeights,
  type SignalContribution,
  weightsValid,
} from "./types";
import {
  extractSkills,
  normalizeSkillList,
  titleTokens,
  detectRemoteType,
  parseSalary,
  resolveSeniority,
} from "./extract";
import { SENIORITY_RANK, type SeniorityLevel } from "./taxonomy";

// --- Sub-score functions (all return 0..1) ---

function skillsScore(job: JobProfile, cand: CandidateProfile): { score: number; matched: string[]; missing: string[]; extra: string[] } {
  const jobSkills = new Set(
    job.skills && job.skills.length > 0
      ? normalizeSkillList(job.skills)
      : extractSkills(`${job.title ?? ""}\n${job.description ?? ""}\n${job.rawText ?? ""}`)
  );
  const candSkills = new Set(cand.skills ?? []);

  const matched: string[] = [];
  const missing: string[] = [];
  for (const s of jobSkills) {
    if (candSkills.has(s)) matched.push(s);
    else missing.push(s);
  }
  const extra = [...candSkills].filter((s) => !jobSkills.has(s));

  if (jobSkills.size === 0) {
    // No skills detected on the job — don't penalize, give partial credit
    // based on how many skills the candidate brings in total (capped).
    const bonus = Math.min(candSkills.size / 10, 1) * 0.6;
    return { score: 0.4 + bonus * 0.2, matched, missing, extra };
  }

  // Coverage: fraction of job skills the candidate has
  const coverage = matched.length / jobSkills.size;
  // Relevance: fraction of candidate skills that are relevant to this job
  const relevance = candSkills.size > 0 ? matched.length / candSkills.size : 0;
  // Blend: coverage dominates (we care if you can do the job, not the opposite)
  const score = 0.75 * coverage + 0.25 * relevance;
  return { score: clamp01(score), matched, missing, extra };
}

function titleScore(job: JobProfile, cand: CandidateProfile): number {
  if (!cand.title) return 0.5; // neutral
  const jobTokens = new Set(titleTokens(job.title ?? ""));
  const candTokens = new Set(titleTokens(cand.title));
  if (jobTokens.size === 0 || candTokens.size === 0) return 0.5;
  let overlap = 0;
  for (const t of jobTokens) if (candTokens.has(t)) overlap += 1;
  // Jaccard similarity between role-family tokens
  const union = jobTokens.size + candTokens.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

function seniorityScore(job: JobProfile, cand: CandidateProfile): { score: number; note: string } {
  const jobLvl = job.seniority ?? resolveSeniority(`${job.title ?? ""} ${job.description ?? ""}`, "mid");
  const candLvl = cand.seniority ?? (cand.title ? resolveSeniority(cand.title, "mid") : "mid");
  const jobRank = SENIORITY_RANK[jobLvl as SeniorityLevel] ?? 2;
  const candRank = SENIORITY_RANK[candLvl as SeniorityLevel] ?? 2;
  const gap = Math.abs(jobRank - candRank);
  // Perfect match → 1.0; ±1 level → 0.75; ±2 → 0.45; ±3 → 0.2; ±4+ → 0.05
  const table = [1, 0.75, 0.45, 0.2, 0.05];
  const score = table[Math.min(gap, table.length - 1)];
  const note =
    gap === 0
      ? `Exact seniority match (${jobLvl})`
      : candRank > jobRank
      ? `Overqualified: ${candLvl} applying to ${jobLvl}`
      : `Stretch: ${candLvl} applying to ${jobLvl}`;
  return { score, note };
}

function locationScore(job: JobProfile, cand: CandidateProfile): { score: number; note: string } {
  const jobLoc = (job.location ?? "").toLowerCase().trim();
  const candLoc = (cand.location ?? "").toLowerCase().trim();
  // If the job is remote, location match doesn't matter
  const jobRemote = job.remoteType ?? detectRemoteType(`${job.title ?? ""} ${job.description ?? ""} ${job.location ?? ""}`);
  if (jobRemote === "remote") {
    return { score: 1, note: "Remote — location match not required" };
  }
  if (!jobLoc) return { score: 0.6, note: "Location unspecified" };
  if (!candLoc) return { score: 0.5, note: "Candidate location unknown" };
  if (jobLoc === candLoc) return { score: 1, note: "Exact location match" };
  // Substring match (e.g. "San Francisco, CA" vs "San Francisco")
  if (jobLoc.includes(candLoc) || candLoc.includes(jobLoc)) {
    return { score: 0.85, note: "Same metro / partial match" };
  }
  // Country-level match (naive: same last 2-3 word token)
  const jobLast = jobLoc.split(/,\s*/).pop() ?? "";
  const candLast = candLoc.split(/,\s*/).pop() ?? "";
  if (jobLast && jobLast === candLast) {
    return { score: 0.5, note: "Same region/country, different metro" };
  }
  return { score: 0.1, note: "Different location" };
}

function remoteScore(job: JobProfile, cand: CandidateProfile): { score: number; note: string } {
  const pref = cand.remotePreference ?? null;
  const jobRemote = job.remoteType ?? detectRemoteType(`${job.title ?? ""} ${job.description ?? ""} ${job.location ?? ""}`);
  if (!pref) return { score: 0.6, note: "No remote preference set" };
  if (!jobRemote) return { score: 0.5, note: "Remote type not specified on posting" };
  if (pref === jobRemote) return { score: 1, note: `Exact ${pref} match` };
  // Partial compatibility table — matches the backend match_service.py bonus rules
  const compatibility: Record<string, Record<string, number>> = {
    remote: { hybrid: 0.7, onsite: 0.1 },
    hybrid: { remote: 0.7, onsite: 0.6 },
    onsite: { hybrid: 0.6, remote: 0.1 },
  };
  const score = compatibility[pref]?.[jobRemote] ?? 0.3;
  return { score, note: `Candidate prefers ${pref}, job is ${jobRemote}` };
}

function recencyScore(job: JobProfile): { score: number; note: string } {
  if (!job.postedAt) return { score: 0.5, note: "Posting date unknown" };
  const posted = typeof job.postedAt === "string" ? Date.parse(job.postedAt) : job.postedAt;
  if (Number.isNaN(posted)) return { score: 0.5, note: "Posting date unparseable" };
  const days = (Date.now() - posted) / (1000 * 60 * 60 * 24);
  // 0-7 days → 1.0; 8-30 → 0.8; 31-60 → 0.5; 61-90 → 0.3; 90+ → 0.1
  if (days <= 7) return { score: 1, note: "Posted within the past week" };
  if (days <= 30) return { score: 0.8, note: `Posted ${Math.round(days)} days ago` };
  if (days <= 60) return { score: 0.5, note: `Posted ${Math.round(days)} days ago` };
  if (days <= 90) return { score: 0.3, note: `Posted ${Math.round(days)} days ago` };
  return { score: 0.1, note: `Stale posting (${Math.round(days)} days old)` };
}

function salaryScore(job: JobProfile, cand: CandidateProfile): { score: number; note: string } {
  const target = cand.salaryTarget ?? null;
  let min = job.salaryMin ?? null;
  let max = job.salaryMax ?? null;
  if (min == null && max == null) {
    // Last-ditch: try to parse from description
    const parsed = parseSalary(`${job.description ?? ""} ${job.rawText ?? ""}`);
    min = parsed.min;
    max = parsed.max;
  }
  if (target == null) return { score: 0.6, note: "No salary target set" };
  if (min == null && max == null) return { score: 0.5, note: "Salary not disclosed" };
  const floor = min ?? max ?? 0;
  const ceiling = max ?? min ?? 0;
  if (target <= floor) return { score: 1, note: `Exceeds target ($${formatMoney(target)})` };
  if (target <= ceiling) return { score: 0.85, note: "Within posted range" };
  // Below target: diminishing score based on gap
  const gap = (target - ceiling) / target;
  if (gap <= 0.1) return { score: 0.6, note: `Slightly below target (${Math.round(gap * 100)}% short)` };
  if (gap <= 0.25) return { score: 0.3, note: `Below target (${Math.round(gap * 100)}% short)` };
  return { score: 0.1, note: `Far below target (${Math.round(gap * 100)}% short)` };
}

function formatMoney(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${n}`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Score a single job-candidate pair. Returns a MatchResult with a full
 * breakdown. Safe to call with minimal data — missing fields get neutral
 * defaults so partial inputs don't crash the pipeline.
 */
export function scoreMatch(
  job: JobProfile,
  candidate: CandidateProfile,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): MatchResult {
  if (!weightsValid(weights)) {
    throw new Error(`Invalid scoring weights — must sum to 1.0, got ${JSON.stringify(weights)}`);
  }

  const skillsResult = skillsScore(job, candidate);
  const title = titleScore(job, candidate);
  const seniority = seniorityScore(job, candidate);
  const location = locationScore(job, candidate);
  const remote = remoteScore(job, candidate);
  const recency = recencyScore(job);
  const salary = salaryScore(job, candidate);

  const breakdown: SignalContribution[] = [
    {
      signal: "skills",
      raw: skillsResult.score,
      weight: weights.skills,
      points: skillsResult.score * weights.skills * 100,
      note:
        skillsResult.matched.length === 0 && skillsResult.missing.length === 0
          ? "No skills detected on posting"
          : `${skillsResult.matched.length}/${skillsResult.matched.length + skillsResult.missing.length} required skills matched`,
    },
    {
      signal: "title",
      raw: title,
      weight: weights.title,
      points: title * weights.title * 100,
      note: candidate.title ? `Role-family overlap vs "${candidate.title}"` : "No candidate title available",
    },
    {
      signal: "seniority",
      raw: seniority.score,
      weight: weights.seniority,
      points: seniority.score * weights.seniority * 100,
      note: seniority.note,
    },
    {
      signal: "location",
      raw: location.score,
      weight: weights.location,
      points: location.score * weights.location * 100,
      note: location.note,
    },
    {
      signal: "remote",
      raw: remote.score,
      weight: weights.remote,
      points: remote.score * weights.remote * 100,
      note: remote.note,
    },
    {
      signal: "recency",
      raw: recency.score,
      weight: weights.recency,
      points: recency.score * weights.recency * 100,
      note: recency.note,
    },
    {
      signal: "salary",
      raw: salary.score,
      weight: weights.salary,
      points: salary.score * weights.salary * 100,
      note: salary.note,
    },
  ];

  const scoreExact = breakdown.reduce((sum, b) => sum + b.points, 0);
  const score = Math.round(scoreExact * 10) / 10;

  const headline = buildHeadline(score, skillsResult.matched.length, skillsResult.missing.length);

  return {
    score,
    scoreExact,
    breakdown,
    matchedSkills: skillsResult.matched,
    missingSkills: skillsResult.missing,
    extraSkills: skillsResult.extra,
    headline,
  };
}

function buildHeadline(score: number, matched: number, missing: number): string {
  if (score >= 85) return `Excellent fit — ${matched}/${matched + missing} skills matched`;
  if (score >= 70) return `Strong fit — worth applying`;
  if (score >= 55) return `Solid fit with some gaps`;
  if (score >= 40) return `Possible fit — review before applying`;
  return `Weak fit — consider skipping or tailoring heavily`;
}

/**
 * Convenience: score a list of jobs for a candidate and return them sorted
 * descending by score. Caller-supplied weights are used if provided.
 */
export function rankJobs(
  jobs: JobProfile[],
  candidate: CandidateProfile,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Array<{ job: JobProfile; match: MatchResult }> {
  return jobs
    .map((job) => ({ job, match: scoreMatch(job, candidate, weights) }))
    .sort((a, b) => b.match.scoreExact - a.match.scoreExact);
}
