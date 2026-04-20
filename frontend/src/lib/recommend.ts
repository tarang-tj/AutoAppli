/**
 * Sprint 6 — cached_jobs recommender.
 *
 * Pure, dependency-free scorer: given the user's resume text, their remote
 * preference, and a slice of CachedJob rows, produces a ranked `RecommendedJob[]`.
 * Runs entirely client-side; the Discover surface calls this from SWR so
 * there's no new network round-trip beyond the cached_jobs pull that already
 * populates the grid.
 *
 * Scoring mirrors the backend's `match_service.py` + `match_v2.py`:
 *
 *   keyword   — TF-IDF weighted overlap of top-30 job keywords vs. resume.
 *                Scaled 0..70 so bonuses can meaningfully move the total.
 *   remote    — +8 exact match, +3 remote↔hybrid overlap, +2 hybrid↔onsite,
 *                −6 remote↔onsite. 0 if either side is missing.
 *   recency   — +5 if posted ≤3d, +3 ≤7d, +1 ≤14d, 0 ≤30d, −2 older.
 *   skills    — +2.5 per resume-token that appears in job.skills[], capped at 10.
 *
 * Final score is clamped 0..100.
 *
 * The stopword + skill-term lists are duplicated here so recommend.ts stays
 * self-contained. Keep them directionally in sync with `match_service.py`;
 * small drift is fine (the lists are heuristics, not canonical data).
 */
import type { CachedJob } from "@/types";

// ── Types ────────────────────────────────────────────────────────────

export type RemotePreference = "remote" | "hybrid" | "onsite";

export interface RecommendInput {
  /** The user's primary resume parsed_text. */
  resumeText: string;
  /** profile.remote_preference. Null/undefined → remote bonus is skipped. */
  remotePreference?: RemotePreference | null;
  /** Active cached_jobs to rank. The caller is responsible for filtering
   *  out `inactive_at !== null` rows before passing them in. */
  jobs: CachedJob[];
  /** Top N to return. Default 12. */
  limit?: number;
}

export interface RecommendationBreakdown {
  keyword: number;
  remoteBonus: number;
  recencyBonus: number;
  skillsBonus: number;
}

export interface RecommendedJob {
  job: CachedJob;
  /** Composite 0..100. */
  score: number;
  breakdown: RecommendationBreakdown;
  /** Short human-readable "why" chips, max 3. */
  reasons: string[];
}

// ── Entry point ──────────────────────────────────────────────────────

export function rankCachedJobs(input: RecommendInput): RecommendedJob[] {
  const { resumeText, remotePreference, jobs, limit = 12 } = input;
  if (!resumeText || jobs.length === 0) return [];

  const resumeKw = extractKeywords(resumeText);
  const resumeSkillSet = new Set(
    Object.keys(resumeKw).filter((k) => SKILL_TERMS.has(k)),
  );

  const ranked: RecommendedJob[] = jobs
    .map((job) => scoreOne(job, resumeKw, resumeSkillSet, remotePreference ?? null))
    // Throw away jobs that match nothing — they don't belong on the rail at all.
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit);
}

// ── One-job scorer (exported for tests / debug overlays) ─────────────

export function scoreOne(
  job: CachedJob,
  resumeKw: Record<string, number>,
  resumeSkillSet: Set<string>,
  pref: RemotePreference | null,
): RecommendedJob {
  const keyword = scoreKeywordOverlap(resumeKw, job.description);
  const remoteBonus = scoreRemoteBonus(pref, job.remote_type);
  const recencyBonus = scoreRecencyBonus(job.posted_at);
  const skillsBonus = scoreSkillsBonus(resumeSkillSet, job.skills ?? []);

  const raw = keyword + remoteBonus + recencyBonus + skillsBonus;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const reasons: string[] = [];
  const overlappedSkills = (job.skills ?? [])
    .filter((s) => resumeSkillSet.has(s.toLowerCase()))
    .slice(0, 3);
  if (overlappedSkills.length > 0) {
    reasons.push(
      `Matches your ${overlappedSkills
        .map((s) => titleCase(s))
        .join(", ")}`,
    );
  }
  if (pref && job.remote_type === pref) {
    reasons.push(`${REMOTE_LABEL[pref]} fit`);
  } else if (pref && job.remote_type && remoteBonus >= 2) {
    reasons.push(`Flexible on ${REMOTE_LABEL[job.remote_type]}`);
  }
  if (recencyBonus >= 3) {
    reasons.push("Posted this week");
  }

  return {
    job,
    score,
    breakdown: { keyword, remoteBonus, recencyBonus, skillsBonus },
    reasons: reasons.slice(0, 3),
  };
}

// ── Component scorers ────────────────────────────────────────────────

function scoreKeywordOverlap(
  resumeKw: Record<string, number>,
  jobDesc: string,
): number {
  if (!jobDesc) return 0;
  const jdKw = extractKeywords(jobDesc);
  const topJd = Object.entries(jdKw)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k]) => k);
  if (topJd.length === 0) return 0;

  const matched = topJd.filter((k) => k in resumeKw);
  const totalW = topJd.reduce((s, k) => s + (jdKw[k] || 0), 0);
  const matchedW = matched.reduce((s, k) => s + (jdKw[k] || 0), 0);
  const ratio = totalW > 0 ? matchedW / totalW : 0;

  // Scale to 0..70 — reserves 30 points of headroom for bonuses, so a job
  // with a weak description but great remote/skill signal can still surface.
  return Math.min(70, Math.max(0, ratio * 84));
}

const REMOTE_COMPATIBILITY: Record<string, number> = {
  "remote-hybrid": 3,
  "hybrid-remote": 3,
  "hybrid-onsite": 2,
  "onsite-hybrid": 2,
  "remote-onsite": -6,
  "onsite-remote": -6,
};

function scoreRemoteBonus(
  pref: RemotePreference | null,
  jobRemote: CachedJob["remote_type"],
): number {
  if (!pref || !jobRemote) return 0;
  if (pref === jobRemote) return 8;
  return REMOTE_COMPATIBILITY[`${pref}-${jobRemote}`] ?? 0;
}

function scoreRecencyBonus(postedAt: string | null): number {
  if (!postedAt) return 0;
  const then = new Date(postedAt).getTime();
  if (!Number.isFinite(then)) return 0;
  const days = (Date.now() - then) / 86_400_000;
  if (days <= 3) return 5;
  if (days <= 7) return 3;
  if (days <= 14) return 1;
  if (days <= 30) return 0;
  return -2;
}

function scoreSkillsBonus(
  resumeSkills: Set<string>,
  jobSkills: string[],
): number {
  const overlap = jobSkills.filter((s) => resumeSkills.has(s.toLowerCase())).length;
  if (overlap === 0) return 0;
  return Math.min(10, overlap * 2.5);
}

// ── Tokenization (mirrors lib/api.ts :: computeDemoMatchScore) ───────

function extractKeywords(text: string): Record<string, number> {
  const tokens = text.toLowerCase().match(/[a-z][a-z0-9+#/.]+/g) ?? [];
  const counts: Record<string, number> = {};
  for (const t of tokens) {
    if (STOP_WORDS.has(t) || t.length < 2) continue;
    counts[t] = (counts[t] || 0) + (SKILL_TERMS.has(t) ? 3 : 1);
  }
  return counts;
}

function titleCase(s: string): string {
  if (!s) return s;
  // Simple + defensive: "javascript" → "Javascript", "ci/cd" → "Ci/cd".
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const REMOTE_LABEL: Record<RemotePreference, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

// Keep these two sets roughly in sync with backend/app/services/match_service.py.
// Small drift is fine — they're heuristics.
const SKILL_TERMS: Set<string> = new Set([
  "python", "java", "javascript", "typescript", "react", "angular", "vue",
  "node", "express", "django", "flask", "fastapi", "spring", "sql",
  "nosql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
  "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd",
  "git", "linux", "bash", "rest", "graphql", "grpc", "kafka", "rabbitmq",
  "spark", "hadoop", "airflow", "dbt", "tableau", "looker", "powerbi",
  "excel", "r", "matlab", "scala", "go", "rust", "c++", "c#", "swift",
  "kotlin", "flutter", "figma", "sketch", "jira", "confluence", "agile",
  "scrum", "product", "analytics", "machine", "learning", "deep",
  "tensorflow", "pytorch", "nlp", "llm", "rag", "langchain", "openai",
  "anthropic", "claude", "data", "pipeline", "etl", "warehouse",
  "snowflake", "bigquery", "redshift", "pandas", "numpy", "scikit",
  "matplotlib", "seaborn", "plotly", "jupyter", "notebook",
  "html", "css", "tailwind", "sass", "webpack", "vite", "nextjs",
  "remix", "svelte", "supabase", "firebase", "vercel", "netlify",
  "communication", "leadership", "collaboration", "strategy",
  "operations", "management", "stakeholder", "metrics", "kpi",
]);

const STOP_WORDS: Set<string> = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "this", "that", "these",
  "those", "it", "its", "i", "we", "you", "they", "he", "she", "my",
  "your", "our", "their", "what", "which", "who", "whom", "where",
  "when", "how", "not", "no", "nor", "if", "then", "than", "so",
  "as", "up", "out", "about", "into", "over", "after", "before",
  "between", "under", "above", "such", "each", "every", "all", "any",
  "both", "few", "more", "most", "other", "some", "very", "just",
  "also", "too", "only", "own", "same", "new", "well", "now",
  "even", "way", "part", "able", "like", "year", "years", "work",
  "working", "experience", "role", "team", "company", "join",
  "looking", "ideal", "candidate", "including", "using", "across",
  "etc", "strong", "highly", "key", "based", "within",
]);
