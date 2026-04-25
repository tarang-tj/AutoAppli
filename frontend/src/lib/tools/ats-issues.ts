/**
 * Heuristic issue detector for the parsed ATS resume.
 *
 * Pure, deterministic, no I/O. Each rule turns a structural or stylistic
 * problem into one short opinionated message. Severity ordering is:
 *   critical > high > medium > low.
 *
 * Run on the output of `parseAts()` plus the original raw text — some
 * checks (tabs, bullet glyphs) need the unparsed string.
 */

import type { AtsParsedResume } from "./ats-parse";

export type IssueSeverity = "critical" | "high" | "medium" | "low";

export interface AtsIssue {
  severity: IssueSeverity;
  message: string;
  detail?: string;
}

const SEVERITY_RANK: Record<IssueSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PASSIVE_OPENERS = [
  "responsible for",
  "tasked with",
  "helped",
  "worked on",
  "assisted",
  "duties included",
];

const VALID_DATE_PATTERNS: RegExp[] = [
  // "May 2024 - Aug 2024", "May 2024 — Present", "Jan. 2024 - May 2024"
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}\s*[-–—]\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|present|current)/i,
  // "May 2024 - Present" with full month name
  /\d{4}\s*[-–—]\s*(present|current)/i,
];

function dateLooksValid(dates: string): boolean {
  if (!dates) return false;
  return VALID_DATE_PATTERNS.some((re) => re.test(dates));
}

export function detectAtsIssues(
  parsed: AtsParsedResume,
  raw: string,
): AtsIssue[] {
  const issues: AtsIssue[] = [];
  const text = raw ?? "";
  const trimmed = text.trim();

  // 1. CRITICAL — email missing
  if (!parsed.contact.email) {
    issues.push({
      severity: "critical",
      message: "Email not detected.",
      detail:
        "ATS systems often strip headers and footers. Move your email into the body of the resume, on its own line.",
    });
  }

  // 2. CRITICAL — phone missing
  if (!parsed.contact.phone) {
    issues.push({
      severity: "critical",
      message: "Phone number not detected.",
      detail:
        "Same fix as email — move it to the body, formatted as (123) 456-7890 or 123-456-7890.",
    });
  }

  // 3. HIGH — no experience entries
  if (parsed.experience.length === 0) {
    issues.push({
      severity: "high",
      message: "No experience entries detected.",
      detail:
        "Make sure your role, company, and dates are on one line, with bullets indented or starting with a glyph below.",
    });
  }

  // 4. HIGH — no skills section
  if (parsed.skills.length === 0) {
    issues.push({
      severity: "high",
      message: "No skills section detected.",
      detail:
        "Add a flat, comma-separated list under a clear \"Skills\" header. Most ATSes index it heavily for keyword matching.",
    });
  }

  // 5. HIGH — no education
  if (parsed.education.length === 0) {
    issues.push({
      severity: "high",
      message: "No education detected.",
      detail:
        "Even an in-progress degree should be listed. Include school, degree, and expected graduation.",
    });
  }

  // 6. HIGH — passive bullet phrasing
  let passiveCount = 0;
  for (const entry of parsed.experience) {
    for (const bullet of entry.bullets) {
      const lower = bullet.toLowerCase().trimStart();
      if (PASSIVE_OPENERS.some((p) => lower.startsWith(p))) {
        passiveCount++;
      }
    }
  }
  if (passiveCount >= 3) {
    issues.push({
      severity: "high",
      message: `${passiveCount} bullets start with passive phrasing.`,
      detail:
        "ATS keyword extraction prefers action verbs — \"Built\", \"Shipped\", \"Reduced\", \"Owned\". Replace \"Responsible for\" / \"Helped\" / \"Worked on\".",
    });
  }

  // 7. HIGH — date format inconsistent
  if (parsed.experience.length > 0) {
    const bad = parsed.experience.filter((e) => e.dates && !dateLooksValid(e.dates));
    if (bad.length > 0) {
      issues.push({
        severity: "high",
        message: "Date format inconsistent across experience entries.",
        detail:
          "Use \"May 2024 — Aug 2024\" or \"May 2024 — Present\". ATS parsers prefer month + year; bare \"2024-2025\" trips them up.",
      });
    }
  }

  // 8. MEDIUM — too long
  if (parsed.estimatedPages > 2) {
    issues.push({
      severity: "medium",
      message: `Resume is approximately ${parsed.estimatedPages} pages.`,
      detail:
        "Many ATSes truncate at page 2, and most recruiters won't scroll past the first. Trim to the strongest material.",
    });
  }

  // 9. MEDIUM — bullet glyph variance
  const glyphsUsed = new Set<string>();
  if (text.includes("•")) glyphsUsed.add("•");
  // Hyphen bullets: only count lines starting with "- " (avoid date hyphens).
  if (/^[\s]*-\s+/m.test(text)) glyphsUsed.add("-");
  if (/^[\s]*\*\s+/m.test(text)) glyphsUsed.add("*");
  if (glyphsUsed.size > 1) {
    issues.push({
      severity: "medium",
      message: `Inconsistent bullet glyphs (${[...glyphsUsed].join(", ")}).`,
      detail:
        "Pick one — a round bullet (•) reads cleanest in most ATS exports — and use it everywhere.",
    });
  }

  // 10. MEDIUM — tabs / column-layout signals
  const hasTabs = /\t/.test(text);
  const wideGapLine = /^.+\s{6,}.+$/m.test(text);
  if (hasTabs || wideGapLine) {
    issues.push({
      severity: "medium",
      message: "Tabs or columnar spacing detected.",
      detail:
        "ATS parsers read top-to-bottom and often misread two-column layouts. Switch to a single-column structure.",
    });
  }

  // 11. LOW — no portfolio / LinkedIn link
  if (parsed.contact.links.length === 0) {
    issues.push({
      severity: "low",
      message: "No portfolio or LinkedIn link detected.",
      detail:
        "Most students add at least one — LinkedIn, GitHub, or a personal site. It's free credibility.",
    });
  }

  // 12. LOW — resume is very short
  if (trimmed.length > 0 && parsed.estimatedPages < 0.5) {
    issues.push({
      severity: "low",
      message: "Resume is very short.",
      detail:
        "Most ATS systems and recruiters expect at least half a page of substance. Add measurable bullets to the strongest role.",
    });
  }

  return issues.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}
