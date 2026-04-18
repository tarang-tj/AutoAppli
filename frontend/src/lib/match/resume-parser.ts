/**
 * Upgraded resume parser that feeds the match scorer.
 *
 * Parses freeform resume text into a `ParsedResume` structure with:
 *   - canonical skill list (via taxonomy)
 *   - latest job title + company
 *   - seniority level
 *   - years of experience
 *   - education hints
 *
 * Deliberately conservative: when we can't detect something with high
 * confidence we return null rather than guessing, so the scorer can fall
 * back to neutral defaults.
 */

import {
  extractSkills,
  normalizeTitle,
  resolveSeniority,
  extractYearsOfExperience,
  detectRemoteType,
} from "./extract";
import type { SeniorityLevel } from "./taxonomy";

export interface ParsedResume {
  fullText: string;
  skills: string[];
  latestTitle: string | null;
  latestCompany: string | null;
  seniority: SeniorityLevel;
  yearsOfExperience: number;
  education: string[];
  emails: string[];
  phones: string[];
  locations: string[];
  remotePreferenceHint: "remote" | "hybrid" | "onsite" | null;
}

const TITLE_LINE_HEURISTIC = /^([A-Z][A-Za-z0-9 .,&/-]{2,60})\s*(?:\||—|–|-|,|@|at)\s*([A-Z][A-Za-z0-9 .,&/-]{2,60})/m;

const EDUCATION_KEYWORDS = [
  "bachelor", "b.s.", "b.a.", "bsc", "ba ",
  "master", "m.s.", "m.a.", "msc", "ma ",
  "phd", "ph.d.", "doctorate",
  "associate degree", "diploma",
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_RE = /(?:\+?\d[\s()-]?){7,14}\d/g;
const LOCATION_HINT_RE = /(?:Based in|Located in|Location:)\s*([A-Za-z ,]+)/i;

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function findTitleAndCompany(text: string): { title: string | null; company: string | null } {
  const match = text.match(TITLE_LINE_HEURISTIC);
  if (match) {
    return { title: match[1].trim(), company: match[2].trim() };
  }
  // Scan line-by-line for the first obvious "Role at Company" pattern
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  for (const line of lines.slice(0, 40)) {
    const at = line.match(/^(.+?)\s+(?:at|@|\|)\s+(.+)$/i);
    if (at && at[1].length < 80 && at[2].length < 80) {
      return { title: at[1].trim(), company: at[2].trim() };
    }
  }
  return { title: null, company: null };
}

function extractEducation(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (EDUCATION_KEYWORDS.some((kw) => lower.includes(kw))) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 200) {
        out.push(trimmed);
      }
    }
  }
  return dedupe(out).slice(0, 5);
}

function extractLocations(text: string): string[] {
  const hits: string[] = [];
  const hint = text.match(LOCATION_HINT_RE);
  if (hint && hint[1]) hits.push(hint[1].trim());
  // Also grab "City, ST" or "City, Country" patterns from the top of the resume
  const top = text.slice(0, 500);
  const cityState = top.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s*([A-Z]{2,3}|[A-Z][a-z]+)\b/g) ?? [];
  for (const h of cityState) hits.push(h);
  return dedupe(hits).slice(0, 3);
}

/**
 * Parse raw resume text into a structured `ParsedResume`. Safe on empty input.
 */
export function parseResume(rawText: string | null | undefined): ParsedResume {
  const text = (rawText ?? "").trim();
  if (!text) {
    return {
      fullText: "",
      skills: [],
      latestTitle: null,
      latestCompany: null,
      seniority: "mid",
      yearsOfExperience: 0,
      education: [],
      emails: [],
      phones: [],
      locations: [],
      remotePreferenceHint: null,
    };
  }

  const { title, company } = findTitleAndCompany(text);
  const skills = extractSkills(text);
  const yoe = extractYearsOfExperience(text);
  const seniority = resolveSeniority(`${title ?? ""} ${text.slice(0, 1000)}`, "mid");
  const emails = dedupe(text.match(EMAIL_RE) ?? []);
  const phones = dedupe(text.match(PHONE_RE) ?? []).map((p) => p.trim());
  const locations = extractLocations(text);
  const education = extractEducation(text);
  const remotePreferenceHint = detectRemoteType(text);

  return {
    fullText: text,
    skills,
    latestTitle: title ? normalizeTitle(title) : null,
    latestCompany: company,
    seniority,
    yearsOfExperience: yoe,
    education,
    emails,
    phones,
    locations,
    remotePreferenceHint,
  };
}
