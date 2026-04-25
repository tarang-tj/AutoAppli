/**
 * ATS resume parser for /tools/ats-view.
 *
 * Pure, deterministic, no I/O. Mimics what a naive ATS parser would
 * extract from plain-text resume input. The point isn't to be a real
 * ATS — it's to communicate the principle: "this is what a parser sees."
 *
 * Heuristics are regex-driven and intentionally simple. Edge-case
 * resumes (multi-column PDFs, non-English headers) won't parse cleanly,
 * which is part of the educational message.
 */

export interface ExperienceEntry {
  company: string;
  role: string;
  dates: string;
  bullets: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  dates: string;
}

export interface ProjectEntry {
  name: string;
  description: string;
}

export interface AtsParsedResume {
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    links: { label: string; url: string }[];
  };
  summary: string | null;
  experience: ExperienceEntry[];
  skills: string[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  raw: string;
  characterCount: number;
  estimatedPages: number;
}

// --- Section header dictionary --------------------------------------------

type SectionKey =
  | "summary"
  | "experience"
  | "skills"
  | "education"
  | "projects"
  | "other";

const SECTION_HEADERS: Array<{ key: SectionKey; pattern: RegExp }> = [
  { key: "summary", pattern: /^(summary|objective|profile|about)\s*:?\s*$/i },
  {
    key: "experience",
    pattern:
      /^(experience|work experience|employment|professional experience|work history)\s*:?\s*$/i,
  },
  {
    key: "skills",
    pattern:
      /^(skills|technical skills|core skills|technologies|tech stack)\s*:?\s*$/i,
  },
  {
    key: "education",
    pattern: /^(education|academic background|academics)\s*:?\s*$/i,
  },
  { key: "projects", pattern: /^(projects|personal projects|side projects)\s*:?\s*$/i },
];

const SCHOOL_KEYWORDS = [
  "university",
  "college",
  "institute",
  "school",
  "polytechnic",
  "academy",
];

const DEGREE_KEYWORDS = [
  "bachelor",
  "b.s.",
  "b.a.",
  "bs ",
  "ba ",
  "b.sc",
  "master",
  "m.s.",
  "m.a.",
  "ms ",
  "ma ",
  "m.sc",
  "phd",
  "ph.d",
  "doctorate",
  "associate",
  "diploma",
  "mba",
];

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*";
const YEAR = "\\d{4}";
const DATE_FRAGMENT = new RegExp(
  `(${MONTH}\\.?\\s+${YEAR}|${YEAR})`,
  "i",
);
const DATE_RANGE = new RegExp(
  // matches "May 2024 - Aug 2024", "2024-2025", "Jan 2024 — Present", etc.
  `(?:${MONTH}\\.?\\s+)?${YEAR}\\s*[-–—]\\s*(?:(?:${MONTH}\\.?\\s+)?${YEAR}|present|current)`,
  "i",
);

const BULLET_GLYPH = /^[\s]*[•·\-*◦▪▸►–]\s+/;

// --- Helpers ---------------------------------------------------------------

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""));
}

function classifyHeader(line: string): SectionKey | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Allow ALL CAPS or Title Case header forms; strip trailing colon.
  const candidate = trimmed.replace(/[:\s]+$/, "");
  for (const { key, pattern } of SECTION_HEADERS) {
    if (pattern.test(candidate)) return key;
  }
  return null;
}

function findEmail(text: string): string | null {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : null;
}

function findPhone(text: string): string | null {
  // Common US-ish phone patterns. Avoid catching dates like "2024-2025".
  const m = text.match(
    /(\+?\d{1,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/,
  );
  return m ? m[0].trim() : null;
}

function findLinks(text: string): { label: string; url: string }[] {
  const out: { label: string; url: string }[] = [];
  const seen = new Set<string>();

  const pushUnique = (label: string, url: string) => {
    const key = url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label, url });
  };

  const fullUrlRe = /https?:\/\/[^\s<>")\]]+/gi;
  for (const m of text.matchAll(fullUrlRe)) {
    const url = m[0].replace(/[.,;]+$/, "");
    let label = "link";
    if (/linkedin\.com/i.test(url)) label = "LinkedIn";
    else if (/github\.com/i.test(url)) label = "GitHub";
    else if (/twitter\.com|x\.com/i.test(url)) label = "Twitter";
    else if (/medium\.com/i.test(url)) label = "Medium";
    else if (/portfolio|\.dev|\.me|\.io/i.test(url)) label = "Portfolio";
    pushUnique(label, url);
  }

  // Bare patterns without protocol.
  const bareRe = /\b(linkedin\.com\/in\/[\w-]+|github\.com\/[\w-]+)/gi;
  for (const m of text.matchAll(bareRe)) {
    const url = `https://${m[0]}`;
    const label = /linkedin/i.test(url) ? "LinkedIn" : "GitHub";
    pushUnique(label, url);
  }

  return out;
}

function findName(lines: string[]): string | null {
  // Look in the first 5 non-empty lines. Pick the first line that looks
  // like a person's name: 2-4 title-case words, no digits, no '@'.
  let scanned = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    scanned++;
    if (scanned > 6) break;
    if (/[@\d]/.test(line)) continue;
    if (line.length > 60) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;
    const titleCase = words.every((w) => /^[A-Z][a-zA-Z'’.-]*$/.test(w));
    const allCaps =
      words.every((w) => /^[A-Z][A-Z'’.-]*$/.test(w)) && line.length <= 40;
    if (titleCase || allCaps) {
      return allCaps
        ? words
            .map(
              (w) => w.charAt(0) + w.slice(1).toLowerCase(),
            )
            .join(" ")
        : line;
    }
  }
  return null;
}

function findLocation(lines: string[]): string | null {
  // Look in the top 8 lines for a "City, ST" or "City, Country" pattern.
  let scanned = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    scanned++;
    if (scanned > 10) break;
    // Skip lines that are obviously contact-info containers but extract from them.
    const m = line.match(
      /\b([A-Z][a-zA-Z.-]+(?:\s[A-Z][a-zA-Z.-]+)*),\s*([A-Z]{2}|[A-Z][a-zA-Z]+)\b/,
    );
    if (m) {
      // Avoid dates.
      if (/\d{4}/.test(m[0])) continue;
      return m[0];
    }
  }
  return null;
}

interface SectionChunk {
  key: SectionKey;
  lines: string[];
}

function splitSections(lines: string[]): {
  preamble: string[];
  sections: SectionChunk[];
} {
  const preamble: string[] = [];
  const sections: SectionChunk[] = [];
  let current: SectionChunk | null = null;
  let inPreamble = true;

  for (const raw of lines) {
    const header = classifyHeader(raw);
    if (header) {
      if (current) sections.push(current);
      current = { key: header, lines: [] };
      inPreamble = false;
      continue;
    }
    if (inPreamble) {
      preamble.push(raw);
    } else if (current) {
      current.lines.push(raw);
    }
  }
  if (current) sections.push(current);
  return { preamble, sections };
}

function parseSummary(chunk: SectionChunk): string | null {
  const text = chunk.lines.join(" ").replace(/\s+/g, " ").trim();
  return text.length ? text : null;
}

function parseSkills(chunk: SectionChunk): string[] {
  const flat = chunk.lines
    .map((l) => l.replace(BULLET_GLYPH, "").trim())
    .filter(Boolean)
    .join(", ");
  if (!flat) return [];
  return flat
    .split(/[,|;·••]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 60);
}

function parseExperience(chunk: SectionChunk): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  let current: ExperienceEntry | null = null;
  let pendingHeaderLine: string | null = null;

  const flush = () => {
    if (current) entries.push(current);
    current = null;
  };

  for (const raw of chunk.lines) {
    const line = raw.trim();
    if (!line) continue;

    const isBullet = BULLET_GLYPH.test(raw);
    if (isBullet) {
      const bulletText = raw.replace(BULLET_GLYPH, "").trim();
      if (current) {
        current.bullets.push(bulletText);
      }
      continue;
    }

    const dateRangeMatch = line.match(DATE_RANGE);
    const hasDate = !!dateRangeMatch || DATE_FRAGMENT.test(line);

    if (hasDate) {
      // Start a new entry. The role/company are either on this line or
      // the previous header line.
      flush();
      const dates = dateRangeMatch
        ? dateRangeMatch[0]
        : (line.match(DATE_FRAGMENT)?.[0] ?? "");
      // Strip the date from the line to get the rest of the header.
      const remainder = line.replace(dates, "").replace(/[—–\-|·•]+/g, " ").trim();
      let role = "";
      let company = "";
      if (remainder) {
        // Try splitting on common separators.
        const parts = remainder
          .split(/\s{2,}|\s[—–|]\s|\sat\s/i)
          .map((p) => p.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          role = parts[0];
          company = parts.slice(1).join(" ");
        } else {
          role = remainder;
        }
      }
      if ((!role || !company) && pendingHeaderLine) {
        const parts = pendingHeaderLine
          .split(/\s{2,}|\s[—–|]\s|\sat\s/i)
          .map((p) => p.trim())
          .filter(Boolean);
        if (!role && parts[0]) role = parts[0];
        if (!company && parts[1]) company = parts.slice(1).join(" ");
        else if (!company && parts[0] && role !== parts[0]) company = parts[0];
      }
      current = {
        company: company || "",
        role: role || "",
        dates,
        bullets: [],
      };
      pendingHeaderLine = null;
      continue;
    }

    // Non-bullet, non-date line: probably a role/company header for a
    // future date line.
    pendingHeaderLine = line;
  }
  flush();

  // Drop fully-empty entries.
  return entries.filter(
    (e) => e.role || e.company || e.dates || e.bullets.length,
  );
}

function parseEducation(chunk: SectionChunk): EducationEntry[] {
  const entries: EducationEntry[] = [];
  // Group lines by date occurrence — each date typically anchors one entry.
  let buffer: string[] = [];
  const groups: string[][] = [];

  for (const raw of chunk.lines) {
    const line = raw.trim();
    if (!line) {
      if (buffer.length) {
        groups.push(buffer);
        buffer = [];
      }
      continue;
    }
    buffer.push(line);
  }
  if (buffer.length) groups.push(buffer);

  // If we got one giant group, split it on date occurrences.
  if (groups.length === 1) {
    const lines = groups[0];
    const split: string[][] = [];
    let cur: string[] = [];
    for (const l of lines) {
      cur.push(l);
      if (DATE_RANGE.test(l) || DATE_FRAGMENT.test(l)) {
        split.push(cur);
        cur = [];
      }
    }
    if (cur.length) {
      if (split.length) split[split.length - 1].push(...cur);
      else split.push(cur);
    }
    if (split.length) {
      groups.length = 0;
      groups.push(...split);
    }
  }

  for (const group of groups) {
    const joined = group.join(" ");
    const dateMatch =
      joined.match(DATE_RANGE) ?? joined.match(DATE_FRAGMENT);
    const dates = dateMatch ? dateMatch[0] : "";
    const lower = joined.toLowerCase();

    let school = "";
    for (const line of group) {
      if (SCHOOL_KEYWORDS.some((k) => line.toLowerCase().includes(k))) {
        school = line.replace(dates, "").replace(/\s{2,}/g, " ").trim();
        break;
      }
    }
    if (!school) {
      // First line is often the school.
      school = (group[0] ?? "").replace(dates, "").trim();
    }

    let degree = "";
    for (const line of group) {
      if (DEGREE_KEYWORDS.some((k) => line.toLowerCase().includes(k))) {
        degree = line.replace(dates, "").trim();
        break;
      }
    }

    if (school || degree || dates) {
      entries.push({ school, degree, dates });
    }
    // Keep `lower` referenced by linters happy (no-op).
    void lower;
  }

  return entries;
}

function splitProjectHeader(line: string): string[] {
  // Split only on em/en dashes, colons, pipes, or " - " with surrounding
  // whitespace — never on bare hyphens inside a name like "ats-view".
  const parts = line.split(/\s[—–|:]\s|\s-\s|:\s/);
  return parts.length > 1 ? parts : [line];
}

function parseProjects(chunk: SectionChunk): ProjectEntry[] {
  const entries: ProjectEntry[] = [];
  let current: ProjectEntry | null = null;

  const flush = () => {
    if (current && (current.name || current.description)) {
      current.description = current.description.trim();
      entries.push(current);
    }
    current = null;
  };

  for (const raw of chunk.lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const isBullet = BULLET_GLYPH.test(raw);
    if (isBullet) {
      const text = raw.replace(BULLET_GLYPH, "").trim();
      if (!current) {
        // Bullet without a header — treat first segment as name.
        const [head, ...rest] = splitProjectHeader(text);
        current = {
          name: head.trim(),
          description: rest.join(" ").trim(),
        };
      } else {
        current.description = current.description
          ? `${current.description} ${text}`
          : text;
      }
    } else {
      // New project header.
      flush();
      const [head, ...rest] = splitProjectHeader(line);
      current = {
        name: head.trim(),
        description: rest.join(" ").trim(),
      };
    }
  }
  flush();

  return entries;
}

// --- Main ------------------------------------------------------------------

export function parseAts(text: string): AtsParsedResume {
  const raw = text ?? "";
  const characterCount = raw.length;
  const estimatedPages = Math.round((characterCount / 1800) * 10) / 10;

  const empty: AtsParsedResume = {
    contact: { name: null, email: null, phone: null, location: null, links: [] },
    summary: null,
    experience: [],
    skills: [],
    education: [],
    projects: [],
    raw,
    characterCount,
    estimatedPages,
  };

  if (!raw.trim()) return empty;

  const lines = normalizeLines(raw);
  const { preamble, sections } = splitSections(lines);

  // Contact info — look in the entire document (email/phone could live
  // anywhere) but prefer the preamble for name + location.
  const email = findEmail(raw);
  const phone = findPhone(raw);
  const links = findLinks(raw);
  const name = findName(preamble.length ? preamble : lines);
  const location = findLocation(preamble.length ? preamble : lines);

  let summary: string | null = null;
  let experience: ExperienceEntry[] = [];
  let skills: string[] = [];
  let education: EducationEntry[] = [];
  let projects: ProjectEntry[] = [];

  for (const chunk of sections) {
    switch (chunk.key) {
      case "summary":
        summary = parseSummary(chunk);
        break;
      case "experience":
        experience = parseExperience(chunk);
        break;
      case "skills":
        skills = parseSkills(chunk);
        break;
      case "education":
        education = parseEducation(chunk);
        break;
      case "projects":
        projects = parseProjects(chunk);
        break;
      default:
        break;
    }
  }

  // Fallback: if no explicit summary section, treat the first paragraph
  // after contact info as the summary (skip the name/contact lines).
  if (!summary && preamble.length) {
    const paragraph: string[] = [];
    for (const line of preamble) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (paragraph.length) break;
        continue;
      }
      // Skip clearly contact-y lines.
      if (
        /[@]/.test(trimmed) ||
        /https?:\/\//i.test(trimmed) ||
        findPhone(trimmed) ||
        (name && trimmed === name)
      ) {
        continue;
      }
      // Skip obvious location lines.
      if (location && trimmed.includes(location)) continue;
      paragraph.push(trimmed);
      if (paragraph.length >= 4) break;
    }
    const candidate = paragraph.join(" ").trim();
    // Only treat as summary if it looks like prose (>= 60 chars).
    if (candidate.length >= 60) summary = candidate;
  }

  return {
    contact: { name, email, phone, location, links },
    summary,
    experience,
    skills,
    education,
    projects,
    raw,
    characterCount,
    estimatedPages,
  };
}
