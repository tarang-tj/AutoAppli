/**
 * Adapters from AutoAppli's existing domain types to the match-scoring
 * pipeline's JobProfile / CandidateProfile shapes.
 *
 * Keeping this in a separate file means the scorer stays independently
 * testable and the rest of the app keeps its existing types.
 */

import {
  extractSkills,
  normalizeSkillList,
  detectRemoteType,
  extractYearsOfExperience,
  resolveSeniority,
} from "./extract";
import type { CandidateProfile, JobProfile } from "./types";
import { normalizeSkill, type SeniorityLevel } from "./taxonomy";

/**
 * Minimal subset of `Job` fields we care about. Accept `unknown`-typed
 * objects so this adapter tolerates slight shape drift across api.ts,
 * demo-data.ts, and Supabase rows.
 */
export interface JobLike {
  id?: string;
  title?: string | null;
  company?: string | null;
  description?: string | null;
  location?: string | null;
  remote_type?: string | null;
  remoteType?: string | null;
  skills?: unknown;
  tags?: unknown;
  salary_min?: number | null;
  salary_max?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salary?: string | null;
  posted_at?: string | number | null;
  postedAt?: string | number | null;
  created_at?: string | number | null;
}

/** Minimal subset of profile fields we care about. */
export interface ProfileLike {
  display_name?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  remote_preference?: string | null;
  remotePreference?: string | null;
  resume_text?: string | null;
  resumeText?: string | null;
  skills?: unknown;
  salary_target?: number | null;
  salaryTarget?: number | null;
}

function firstString(...candidates: Array<unknown>): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c;
  }
  return null;
}

function coerceRemote(v: string | null | undefined): "remote" | "hybrid" | "onsite" | null {
  if (!v) return null;
  const lower = v.toLowerCase().trim();
  if (lower === "remote" || lower === "hybrid" || lower === "onsite") return lower;
  if (lower === "on-site" || lower === "on site") return "onsite";
  return null;
}

function coerceSkillArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/** Convert a DB/API Job row to a JobProfile for scoring. */
export function toJobProfile(job: JobLike): JobProfile {
  const title = firstString(job.title) ?? "";
  const description = firstString(job.description) ?? "";
  const location = firstString(job.location) ?? "";
  const rawSkills = coerceSkillArray(job.skills);
  const rawTags = coerceSkillArray(job.tags);
  const combinedSkillInput = [...rawSkills, ...rawTags];
  const normalizedSkills = combinedSkillInput.length > 0
    ? normalizeSkillList(combinedSkillInput)
    : extractSkills(`${title}\n${description}`);
  const remoteType = coerceRemote(firstString(job.remoteType, job.remote_type))
    ?? detectRemoteType(`${title} ${description} ${location}`);

  return {
    id: job.id,
    title,
    company: firstString(job.company) ?? undefined,
    description,
    location,
    rawText: `${title}\n${description}`,
    skills: normalizedSkills,
    seniority: resolveSeniority(title, "mid"),
    remoteType,
    salaryMin: job.salaryMin ?? job.salary_min ?? null,
    salaryMax: job.salaryMax ?? job.salary_max ?? null,
    postedAt: job.postedAt ?? job.posted_at ?? job.created_at ?? null,
  };
}

/** Convert a profile row + resume text to a CandidateProfile for scoring. */
export function toCandidateProfile(profile: ProfileLike): CandidateProfile {
  const resumeText = firstString(profile.resumeText, profile.resume_text) ?? "";
  const rawSkills = coerceSkillArray(profile.skills);
  const skills = rawSkills.length > 0
    ? normalizeSkillList(rawSkills)
    : extractSkills(`${profile.headline ?? ""}\n${profile.bio ?? ""}\n${resumeText}`);
  const title = firstString(profile.headline) ?? null;
  const seniority: SeniorityLevel = resolveSeniority(`${title ?? ""} ${resumeText}`, "mid");
  const yoe = extractYearsOfExperience(resumeText);
  return {
    skills,
    title,
    seniority,
    yearsOfExperience: yoe,
    location: firstString(profile.location),
    remotePreference: coerceRemote(firstString(profile.remotePreference, profile.remote_preference)),
    salaryTarget: profile.salaryTarget ?? profile.salary_target ?? null,
    resumeText,
  };
}

/** Tiny convenience re-export so callers get everything from one import. */
export { normalizeSkill };
