/**
 * Shared types for the match-scoring v2 pipeline.
 *
 * These types are independent of the existing `frontend/src/types/index.ts`
 * Job / Profile shapes so the module stays self-contained. Adapter functions
 * in `./adapters.ts` convert AutoAppli's `Job` / `ProfileResponse` into these
 * shapes, which keeps scoring testable in isolation.
 */

import type { SeniorityLevel } from "./taxonomy";

/** Input: everything we know about a job posting that's relevant to matching. */
export interface JobProfile {
  id?: string;
  title: string;
  company?: string;
  description?: string;
  location?: string;
  /** The raw combined text (title + description + additional) used for fallback TF-IDF. */
  rawText?: string;
  /** Canonical skill names (normalized) — pre-extracted when possible. */
  skills?: string[];
  /** Detected or declared seniority level. */
  seniority?: SeniorityLevel | null;
  /** One of: remote | hybrid | onsite | null. */
  remoteType?: "remote" | "hybrid" | "onsite" | null;
  /** Salary range floor in USD-equivalent. Null when unknown. */
  salaryMin?: number | null;
  /** Salary range ceiling in USD-equivalent. Null when unknown. */
  salaryMax?: number | null;
  /** Posting timestamp (ISO8601 or epoch ms). */
  postedAt?: string | number | null;
}

/** Input: everything we know about the candidate that's relevant to matching. */
export interface CandidateProfile {
  /** Canonical skill names (normalized) extracted from the candidate's resume. */
  skills: string[];
  /** Latest/most prominent title. */
  title?: string | null;
  /** Seniority level derived from resume or self-reported. */
  seniority?: SeniorityLevel | null;
  /** Total years of experience — integer, 0 when unknown. */
  yearsOfExperience?: number;
  /** Candidate's preferred location (city, region, etc.). */
  location?: string | null;
  /** One of: remote | hybrid | onsite | null. */
  remotePreference?: "remote" | "hybrid" | "onsite" | null;
  /** Candidate's minimum acceptable salary in USD-equivalent. */
  salaryTarget?: number | null;
  /** Free-text resume body — used for TF-IDF fallback on vague postings. */
  resumeText?: string;
}

/** Per-signal contribution to the final score. */
export interface SignalContribution {
  signal: "skills" | "title" | "seniority" | "location" | "remote" | "recency" | "salary";
  /** Raw 0..1 sub-score for this signal. */
  raw: number;
  /** Weight applied to this signal (0..1, sums to 1 across all signals). */
  weight: number;
  /** Contribution to the final 0..100 score (raw * weight * 100). */
  points: number;
  /** Human-readable explanation. Short — fits in a tooltip. */
  note: string;
}

/** Full scoring result with explanation. */
export interface MatchResult {
  /** Final 0..100 score. Rounded to one decimal in `score`, precise in `scoreExact`. */
  score: number;
  scoreExact: number;
  /** Per-signal breakdown — always in the same order for stable UI. */
  breakdown: SignalContribution[];
  /** Skills on both sides of the comparison (normalized names). */
  matchedSkills: string[];
  /** Skills the job requires but candidate lacks (gap analysis). */
  missingSkills: string[];
  /** Skills the candidate has that aren't mentioned in the posting. */
  extraSkills: string[];
  /** Top-line human summary — one sentence. */
  headline: string;
}

/** Weights for scoring. Must sum to 1.0. */
export interface ScoringWeights {
  skills: number;
  title: number;
  seniority: number;
  location: number;
  remote: number;
  recency: number;
  salary: number;
}

/** Default weights — tuned for tech roles. Total = 1.0. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 0.4,
  title: 0.15,
  seniority: 0.1,
  location: 0.1,
  remote: 0.1,
  recency: 0.05,
  salary: 0.1,
};

/** Validate that a weights object sums to 1.0 within a small epsilon. */
export function weightsValid(w: ScoringWeights, eps = 0.001): boolean {
  const sum = w.skills + w.title + w.seniority + w.location + w.remote + w.recency + w.salary;
  return Math.abs(sum - 1) < eps;
}
