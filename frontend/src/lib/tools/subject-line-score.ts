/**
 * Subject-line scorer for the public /tools/subject-line-tester page.
 *
 * Pure, deterministic, no I/O. Heuristics tuned for student cold outreach
 * (recruiter intros, alum DMs, hiring-manager pings). The point isn't to
 * be a real ML classifier — it's to flag the obvious tells of a copy-paste
 * template and nudge toward something specific.
 *
 * Score range: 0–10 (clamped, integer-rounded).
 *   weak  ≤ 4
 *   ok    5–7
 *   strong 8–10
 */

export type SubjectLineCategory = "weak" | "ok" | "strong";

export interface SubjectLineScore {
  score: number;
  category: SubjectLineCategory;
  signals: string[];
  suggestions?: string[];
}

// --- Heuristic dictionaries ------------------------------------------------

const SPAM_PHRASES = [
  "quick question",
  "hope this finds you well",
  "just checking in",
  "touching base",
  "reaching out",
  "circling back",
  "circle back",
  "synergy",
  "sorry to bother",
];

// Acronyms that legitimately appear in CAPS in cold outreach subject lines.
// All-caps detection skips these.
const ALLOWED_ACRONYMS = new Set([
  "SQL", "AWS", "GCP", "API", "CSS", "HTML", "ML", "AI", "PM", "QA", "UX",
  "UI", "SDE", "DS", "CS", "JS", "TS", "IOS", "MBA", "PHD", "FAANG",
  "REST", "GRPC", "K8S", "NLP", "CV", "SRE", "DEVOPS",
]);

// Small whitelist of role-title nouns to detect "specificity".
const ROLE_TITLES = [
  "engineer", "engineering", "analyst", "scientist", "designer",
  "developer", "manager", "consultant", "intern", "researcher",
  "recruiter", "associate", "founder", "lead", "architect",
  "pm", "swe", "sde",
];

// --- Suggestion templates --------------------------------------------------

const SUGGESTIONS = [
  "Specific role + named connection: \"<Role> question — referred by <Name>\"",
  "Their work, not yours: \"Your 2024 talk on <Topic> — quick follow-up\"",
  "Concrete + scoped: \"<School> junior — 2-min question about the <Team> role\"",
];

// --- Helpers ---------------------------------------------------------------

function tokenize(input: string): string[] {
  return input
    .replace(/[—–]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function categorize(score: number): SubjectLineCategory {
  if (score <= 4) return "weak";
  if (score <= 7) return "ok";
  return "strong";
}

// --- Main scorer -----------------------------------------------------------

export function scoreSubjectLine(input: string): SubjectLineScore {
  const trimmed = (input ?? "").trim();
  const signals: string[] = [];

  if (trimmed.length === 0) {
    return {
      score: 0,
      category: "weak",
      signals: ["Type a subject line to get a score."],
      suggestions: SUGGESTIONS,
    };
  }

  let score = 5; // start neutral

  // --- Length ---
  const tokens = tokenize(trimmed);
  const wordCount = tokens.length;
  if (wordCount >= 5 && wordCount <= 7) {
    score += 1;
    signals.push(`Length is in the sweet spot (${wordCount} words).`);
  } else if (wordCount < 4) {
    score -= 2;
    signals.push(`Too short — ${wordCount} word${wordCount === 1 ? "" : "s"}. Aim for 5–7.`);
  } else if (wordCount > 9) {
    score -= 2;
    signals.push(`Too long — ${wordCount} words. Cut to 5–7.`);
  } else {
    signals.push(`Length is okay (${wordCount} words). Sweet spot is 5–7.`);
  }

  // --- Spam phrases (case-insensitive substring) ---
  const lower = trimmed.toLowerCase();
  const spamHits: string[] = [];
  for (const phrase of SPAM_PHRASES) {
    if (lower.includes(phrase)) {
      spamHits.push(phrase);
      score -= 1;
    }
  }
  if (spamHits.length > 0) {
    signals.push(
      `Recruiter-template phrases detected: ${spamHits.map((p) => `"${p}"`).join(", ")}. They get muted.`,
    );
  }

  // --- Specificity bonuses (cap +2) ---
  let specificityBonus = 0;
  const personMatch = trimmed.match(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/);
  if (personMatch) {
    specificityBonus += 1;
    signals.push(`Names a person ("${personMatch[0]}") — that reads specific.`);
  }
  // Company / proper-noun heuristic: TitleCase or ALLCAPS word ≥4 chars,
  // not at the start of the string.
  const properNounRegex = /(?<!^)(?<!\.\s)\b([A-Z][a-zA-Z]{3,}|[A-Z]{4,})\b/g;
  const properNouns = Array.from(trimmed.matchAll(properNounRegex)).map((m) => m[1]);
  // Filter out the role-title words that happened to be capitalized.
  const filteredProper = properNouns.filter(
    (w) => !ROLE_TITLES.includes(w.toLowerCase()) && !ALLOWED_ACRONYMS.has(w.toUpperCase()),
  );
  if (filteredProper.length > 0 && specificityBonus < 2) {
    specificityBonus += 1;
    signals.push(`References "${filteredProper[0]}" — gives the reader a hook.`);
  }
  const lowerTokens = tokens.map((t) => t.replace(/[^a-zA-Z]/g, "").toLowerCase());
  const roleHit = lowerTokens.find((t) => ROLE_TITLES.includes(t));
  if (roleHit && specificityBonus < 2) {
    specificityBonus += 1;
    signals.push(`Names a role ("${roleHit}") — recruiters scan for that.`);
  }
  score += Math.min(specificityBonus, 2);

  // --- Question marks ---
  const questionMarks = (trimmed.match(/\?/g) ?? []).length;
  if (questionMarks === 1 && trimmed.endsWith("?")) {
    score += 0.5;
    signals.push("Ends with a single question mark — invites a reply.");
  } else if (questionMarks > 1) {
    score -= 1;
    signals.push("Multiple question marks read as yelling. Use one.");
  }

  // --- All-caps shouting ---
  // 4+ letter all-caps only. Three-letter capitals are too often legitimate
  // school/company acronyms (CMU, MIT, IBM) to be worth a false-positive.
  const shoutingWord = tokens.find((t) => {
    const stripped = t.replace(/[^A-Za-z]/g, "");
    return (
      stripped.length >= 4 &&
      stripped === stripped.toUpperCase() &&
      stripped !== stripped.toLowerCase() &&
      !ALLOWED_ACRONYMS.has(stripped.toUpperCase())
    );
  });
  if (shoutingWord) {
    score -= 1;
    signals.push(`"${shoutingWord}" reads as shouting. Lowercase it.`);
  }

  // --- Re: / Fwd: prefix ---
  if (/^\s*(re|fwd|fw):/i.test(trimmed)) {
    score -= 1;
    signals.push("Starts with Re:/Fwd: — fake-thread bait. Recruiters notice.");
  }

  // --- Finalize ---
  const finalScore = Math.round(clamp(score, 0, 10));
  const category = categorize(finalScore);

  // Add a positive top-line signal if no warnings were added.
  if (category === "strong" && signals.length === 1) {
    signals.unshift("Specific, scoped, and free of recruiter-template tells.");
  }

  const result: SubjectLineScore = {
    score: finalScore,
    category,
    signals,
  };
  if (finalScore < 7) {
    result.suggestions = SUGGESTIONS;
  }
  return result;
}
