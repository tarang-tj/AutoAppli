/**
 * Public API for match scoring v2.
 *
 * Usage:
 *   import { scoreMatch, rankJobs, toJobProfile, toCandidateProfile } from "@/lib/match";
 *
 *   const candidate = toCandidateProfile(profileRow);
 *   const ranked = rankJobs(jobs.map(toJobProfile), candidate);
 *   // ranked[0] → { job, match: { score, breakdown, matchedSkills, ... } }
 */

export { scoreMatch, rankJobs } from "./score";
export {
  toJobProfile,
  toCandidateProfile,
  type JobLike,
  type ProfileLike,
} from "./adapters";
export {
  DEFAULT_WEIGHTS,
  type ScoringWeights,
  type MatchResult,
  type SignalContribution,
  type JobProfile,
  type CandidateProfile,
  weightsValid,
} from "./types";
export {
  SKILLS,
  normalizeSkill,
  getSkill,
  skillLabel,
  groupByCategory,
  detectSeniority,
  SENIORITY_RANK,
  type CanonicalSkill,
  type SkillCategory,
  type SeniorityLevel,
} from "./taxonomy";
export {
  extractSkills,
  normalizeSkillList,
  normalizeTitle,
  titleTokens,
  resolveSeniority,
  extractYearsOfExperience,
  detectRemoteType,
  parseSalary,
} from "./extract";
