/**
 * Text extraction helpers for match scoring v2.
 *
 * Used by both the resume parser upgrade and the job ingestion pipeline
 * so that skills, titles, and seniorities come out in a canonical form
 * that can be compared directly.
 */

import { SKILLS, normalizeSkill, detectSeniority, type SeniorityLevel } from "./taxonomy";

/** Build a regex that matches whole-word / phrase occurrences of a skill alias. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Pre-compiled regex list: [regex, canonicalName]. Sorted by alias length
 * descending so multi-word phrases match before their constituent words.
 */
const SKILL_PATTERNS: Array<[RegExp, string]> = (() => {
  const pairs: Array<[string, string]> = [];
  for (const skill of SKILLS) {
    pairs.push([skill.name, skill.name]);
    for (const alias of skill.aliases) {
      pairs.push([alias, skill.name]);
    }
  }
  // longest-first match
  pairs.sort((a, b) => b[0].length - a[0].length);
  return pairs.map(([alias, canon]) => {
    // Word-boundary for alphanumeric edges; allow dots, pluses, hashes inside
    const body = escapeRegex(alias);
    const leftBoundary = /[a-z0-9]/i.test(alias[0] ?? "") ? "\\b" : "(?:^|[^a-z0-9])";
    const rightBoundary = /[a-z0-9]/i.test(alias[alias.length - 1] ?? "") ? "\\b" : "(?:$|[^a-z0-9])";
    return [new RegExp(`${leftBoundary}${body}${rightBoundary}`, "i"), canon];
  });
})();

/**
 * Extract canonical skill names mentioned in a block of free text.
 *
 * Order of returned skills is insertion order (first-seen-first).
 * Duplicates are collapsed.
 */
export function extractSkills(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const [pattern, canon] of SKILL_PATTERNS) {
    if (pattern.test(text) && !seen.has(canon)) {
      seen.add(canon);
      out.push(canon);
    }
  }
  return out;
}

/**
 * Extract skills from a structured skills list (e.g. LinkedIn-style tags).
 * Each entry is normalized; unknowns are dropped.
 */
export function normalizeSkillList(skills: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of skills) {
    if (!raw) continue;
    const canon = normalizeSkill(raw);
    if (canon && !seen.has(canon)) {
      seen.add(canon);
      out.push(canon);
    }
  }
  return out;
}

const TITLE_CLEANUP = [
  /\(.*?\)/g, // parenthesized
  /[,\-–—|].*$/g, // after separator
];

/** Strip noise from a job title so short-string similarity works better. */
export function normalizeTitle(raw: string): string {
  let t = raw.toLowerCase().trim();
  for (const pat of TITLE_CLEANUP) t = t.replace(pat, "");
  return t.replace(/\s+/g, " ").trim();
}

/**
 * Extract role "family" tokens from a title — e.g. "frontend engineer" →
 * ["frontend", "engineer"], "senior ml scientist" → ["ml", "scientist"].
 * Used for title similarity that ignores seniority words.
 */
const SENIORITY_TOKENS = new Set([
  "junior","jr","senior","sr","staff","principal","lead","manager","director",
  "vp","chief","intern","associate","i","ii","iii","iv","v"
]);

export function titleTokens(raw: string): string[] {
  const norm = normalizeTitle(raw);
  return norm.split(/\s+/)
    .map((t) => t.replace(/\./g, ""))
    .filter((t) => t.length > 0 && !SENIORITY_TOKENS.has(t));
}

/** Detect seniority with a fallback to `mid` when nothing matches. */
export function resolveSeniority(text: string | null | undefined, fallback: SeniorityLevel = "mid"): SeniorityLevel {
  if (!text) return fallback;
  return detectSeniority(text) ?? fallback;
}

/** Extract a rough years-of-experience number from freeform resume text. */
export function extractYearsOfExperience(text: string | null | undefined): number {
  if (!text) return 0;
  // Pattern 1: explicit "X years of experience"
  const explicit = text.match(/(\d{1,2})\+?\s*(?:years|yrs)\s*(?:of)?\s*(?:experience|exp)?/i);
  if (explicit) {
    const years = parseInt(explicit[1], 10);
    if (!Number.isNaN(years) && years >= 0 && years <= 50) return years;
  }
  // Pattern 2: sum up year ranges like "2019-2024", "2018-present"
  const currentYear = new Date().getFullYear();
  const ranges = Array.from(text.matchAll(/\b(19\d{2}|20\d{2})\s*[-–—]\s*(present|current|19\d{2}|20\d{2})\b/gi));
  let total = 0;
  for (const m of ranges) {
    const start = parseInt(m[1], 10);
    const endRaw = m[2].toLowerCase();
    const end = endRaw === "present" || endRaw === "current" ? currentYear : parseInt(endRaw, 10);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      total += end - start;
    }
  }
  // Cap at reasonable bounds — resumes with overlapping ranges overcount
  return Math.min(total, 25);
}

/**
 * Detect remote type from a title/description combined string.
 * Returns null when the posting doesn't mention remote / hybrid / onsite at all.
 */
export function detectRemoteType(text: string | null | undefined): "remote" | "hybrid" | "onsite" | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  // Hybrid is checked first since "remote hybrid" or "hybrid remote" should resolve to hybrid
  if (/\bhybrid\b/.test(lower)) return "hybrid";
  if (/\b(fully remote|100% remote|remote first|remote-first|work from home|wfh|distributed)\b/.test(lower)) return "remote";
  if (/\b(remote)\b/.test(lower) && !/\b(not remote|no remote|on[- ]?site required|in[- ]?office required)\b/.test(lower)) return "remote";
  if (/\b(on[- ]?site|in[- ]?office|office based|office-based)\b/.test(lower)) return "onsite";
  return null;
}

/** Parse a salary string like "$120k-150k", "$120,000 - $150,000", "USD 120K–180K". */
export function parseSalary(text: string | null | undefined): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  // Handle k-suffixed ranges
  const kRange = text.match(/\$?\s*(\d{2,3})\s*[kK]\s*[-–—to]+\s*\$?\s*(\d{2,3})\s*[kK]/);
  if (kRange) {
    const min = parseInt(kRange[1], 10) * 1000;
    const max = parseInt(kRange[2], 10) * 1000;
    return { min, max };
  }
  // Handle comma-separated ranges
  const commaRange = text.match(/\$\s*(\d{2,3}(?:,\d{3})+)\s*[-–—to]+\s*\$?\s*(\d{2,3}(?:,\d{3})+)/);
  if (commaRange) {
    const min = parseInt(commaRange[1].replace(/,/g, ""), 10);
    const max = parseInt(commaRange[2].replace(/,/g, ""), 10);
    return { min, max };
  }
  // Single number with k suffix
  const kSingle = text.match(/\$?\s*(\d{2,3})\s*[kK]\b/);
  if (kSingle) {
    const val = parseInt(kSingle[1], 10) * 1000;
    return { min: val, max: val };
  }
  return { min: null, max: null };
}
