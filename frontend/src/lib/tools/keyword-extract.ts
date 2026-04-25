/**
 * Keyword extractor for the public /tools/resume-keyword-extractor page.
 *
 * Pure, deterministic. Runs entirely client-side — no AI, no API.
 *
 * Goal: surface the 15–20 terms a recruiter (or, more honestly, an ATS
 * keyword filter) is likely to scan for. We score by frequency with a
 * mild bonus for terms that show up early in the JD (those are usually
 * the ones the hiring manager cared about enough to put up top).
 */

export interface ExtractedKeyword {
  term: string;
  frequency: number;
  weight: number;
}

// --- Stopword & filler lists ----------------------------------------------

// Generic English stopwords. Kept small (≈50) — the heavy lifting is done
// by the job-posting filler list below.
const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "and", "or", "for", "with", "on",
  "at", "by", "from", "as", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "should", "can", "could", "may", "might", "must", "this", "that",
  "these", "those", "i", "you", "your", "we", "our", "us", "they",
  "their", "them", "it", "its", "who", "what", "when", "where", "why",
  "how",
]);

// Job-posting filler that's noise in 99% of JDs.
const JOB_FILLER = new Set([
  "required", "preferred", "experience", "ability", "candidate", "team",
  "role", "position", "company", "include", "responsible", "skills",
  "knowledge", "strong", "looking", "join", "must", "should", "work",
  "working", "across", "etc", "plus", "also", "well", "able", "using",
  "use", "used", "build", "building", "help", "make", "makes", "made",
  "new", "year", "years",
]);

// --- Multi-word terms ------------------------------------------------------

// Hard list of bigrams/trigrams to detect when adjacent in source.
// Keep this list short on purpose — every entry is a real term that
// would lose meaning if split (e.g. "machine learning" ≠ "machine" + "learning").
const MULTI_WORD_TERMS: string[] = [
  "machine learning",
  "deep learning",
  "data science",
  "data engineering",
  "data analysis",
  "software engineering",
  "computer science",
  "front end",
  "back end",
  "full stack",
  "react native",
  "node js",
  "next js",
  "amazon web services",
  "google cloud",
  "machine learning engineer",
  "natural language processing",
  "computer vision",
  "object oriented",
  "version control",
  "ci cd",
  "unit testing",
  "test driven",
  "agile development",
  "product management",
];

// --- Helpers ---------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    // Strip dot/slash that aren't part of a known token. We keep them in
    // the matchable token below via a normalization pass.
    .split(/\s+/)
    .map((t) => t.replace(/^[-./+#]+|[-./+#]+$/g, ""))
    .filter((t) => t.length >= 2 && t.length <= 24);
}

function isContent(token: string): boolean {
  if (STOPWORDS.has(token)) return false;
  if (JOB_FILLER.has(token)) return false;
  if (/^\d+$/.test(token)) return false;
  return true;
}

/**
 * Find multi-word terms in the text. Returns matched terms with the index
 * (in tokens array) of their first appearance, so the caller can subtract
 * the constituent tokens from the unigram count.
 */
function findMultiWordTerms(
  tokens: string[],
): { term: string; firstIdx: number; count: number; consumed: Set<number> }[] {
  const results: {
    term: string;
    firstIdx: number;
    count: number;
    consumed: Set<number>;
  }[] = [];
  for (const phrase of MULTI_WORD_TERMS) {
    const parts = phrase.split(" ");
    let firstIdx = -1;
    let count = 0;
    const consumed = new Set<number>();
    for (let i = 0; i <= tokens.length - parts.length; i++) {
      let match = true;
      for (let j = 0; j < parts.length; j++) {
        if (tokens[i + j] !== parts[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        if (firstIdx === -1) firstIdx = i;
        count += 1;
        for (let j = 0; j < parts.length; j++) consumed.add(i + j);
      }
    }
    if (count > 0) {
      results.push({ term: phrase, firstIdx, count, consumed });
    }
  }
  return results;
}

// --- Main extractor --------------------------------------------------------

export function extractKeywords(
  text: string,
  opts?: { topN?: number },
): ExtractedKeyword[] {
  const topN = opts?.topN ?? 18;
  const trimmed = (text ?? "").trim();
  if (trimmed.length === 0) return [];

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return [];

  // Index of the character offset where each token starts. We approximate
  // by walking the original text — for the early-bonus we only care if
  // the first occurrence is in the first ~200 chars, which is robust to
  // imprecision.
  const lower = trimmed.toLowerCase();

  // 1. Multi-word terms first; track which indices are consumed.
  const multi = findMultiWordTerms(tokens);
  const consumed = new Set<number>();
  for (const m of multi) for (const idx of m.consumed) consumed.add(idx);

  // 2. Unigrams: count and find first index, skipping consumed positions.
  const unigramFreq = new Map<string, number>();
  const unigramFirstIdx = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;
    const t = tokens[i];
    if (!isContent(t)) continue;
    unigramFreq.set(t, (unigramFreq.get(t) ?? 0) + 1);
    if (!unigramFirstIdx.has(t)) unigramFirstIdx.set(t, i);
  }

  // 3. Score everything. early-bonus = 1 if first occurrence is in first
  // 200 chars of source text, else 0. weight = freq * (1 + 0.5 * earlyBonus).
  const out: ExtractedKeyword[] = [];

  for (const { term, count } of multi) {
    const firstCharIdx = lower.indexOf(term);
    const earlyBonus = firstCharIdx >= 0 && firstCharIdx < 200 ? 1 : 0;
    out.push({
      term,
      frequency: count,
      weight: count * (1 + 0.5 * earlyBonus),
    });
  }

  for (const [term, freq] of unigramFreq) {
    const firstCharIdx = lower.indexOf(term);
    const earlyBonus = firstCharIdx >= 0 && firstCharIdx < 200 ? 1 : 0;
    out.push({
      term,
      frequency: freq,
      weight: freq * (1 + 0.5 * earlyBonus),
    });
  }

  // Sort by weight desc, tiebreak by frequency desc, then alpha for stability.
  out.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    return a.term.localeCompare(b.term);
  });

  return out.slice(0, topN);
}

/**
 * Returns the keywords from `jdKeywords` whose `term` is NOT present
 * (as substring) in the lowercased resume text. Used to power the
 * "Skills you might be missing" chip section.
 */
export function findMissingKeywords(
  jdKeywords: ExtractedKeyword[],
  resumeText: string,
): ExtractedKeyword[] {
  const resumeLower = (resumeText ?? "").toLowerCase();
  if (resumeLower.trim().length === 0) return [];
  return jdKeywords.filter((k) => !resumeLower.includes(k.term));
}
