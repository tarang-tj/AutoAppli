/**
 * Canonical skill taxonomy for AutoAppli match scoring.
 *
 * Single source of truth used by:
 *  - frontend/src/lib/match/extract.ts (job + resume parsing)
 *  - frontend/src/lib/match/score.ts (match scoring v2)
 *  - backend/app/services/taxonomy.py (Python mirror — keep in sync)
 *
 * Adding a skill?
 *   1. Add to SKILLS with its canonical name lowercased
 *   2. List every realistic alias (lowercased, including common typos / abbreviations)
 *   3. Tag it with a category for filter UI
 */

export type SkillCategory =
  | "language"
  | "framework"
  | "database"
  | "cloud"
  | "devops"
  | "data"
  | "ml"
  | "design"
  | "product"
  | "soft"
  | "tool";

export interface CanonicalSkill {
  /** Canonical lowercase name. */
  name: string;
  /** Display label (preserve casing for UI). */
  label: string;
  /** Aliases including common abbreviations, full names, common misspellings. */
  aliases: string[];
  /** High-level category for filter chips and grouping. */
  category: SkillCategory;
}

export const SKILLS: CanonicalSkill[] = [
  // languages
  { name: "javascript", label: "JavaScript", category: "language", aliases: ["js", "ecmascript", "es6", "es2015"] },
  { name: "typescript", label: "TypeScript", category: "language", aliases: ["ts"] },
  { name: "python", label: "Python", category: "language", aliases: ["py", "python3"] },
  { name: "go", label: "Go", category: "language", aliases: ["golang"] },
  { name: "rust", label: "Rust", category: "language", aliases: [] },
  { name: "java", label: "Java", category: "language", aliases: [] },
  { name: "kotlin", label: "Kotlin", category: "language", aliases: [] },
  { name: "swift", label: "Swift", category: "language", aliases: [] },
  { name: "objective-c", label: "Objective-C", category: "language", aliases: ["objc", "obj-c"] },
  { name: "c++", label: "C++", category: "language", aliases: ["cpp", "cplusplus"] },
  { name: "c#", label: "C#", category: "language", aliases: ["csharp", "c-sharp", "dotnet", ".net"] },
  { name: "ruby", label: "Ruby", category: "language", aliases: [] },
  { name: "php", label: "PHP", category: "language", aliases: [] },
  { name: "scala", label: "Scala", category: "language", aliases: [] },
  { name: "r", label: "R", category: "language", aliases: [] },
  { name: "sql", label: "SQL", category: "language", aliases: ["structured query language"] },
  { name: "html", label: "HTML", category: "language", aliases: ["html5"] },
  { name: "css", label: "CSS", category: "language", aliases: ["css3"] },

  // frontend frameworks
  { name: "react", label: "React", category: "framework", aliases: ["reactjs", "react.js"] },
  { name: "next.js", label: "Next.js", category: "framework", aliases: ["nextjs", "next"] },
  { name: "vue", label: "Vue", category: "framework", aliases: ["vuejs", "vue.js", "vue3"] },
  { name: "angular", label: "Angular", category: "framework", aliases: ["angularjs"] },
  { name: "svelte", label: "Svelte", category: "framework", aliases: ["sveltekit"] },
  { name: "tailwindcss", label: "Tailwind CSS", category: "framework", aliases: ["tailwind"] },

  // backend frameworks
  { name: "node.js", label: "Node.js", category: "framework", aliases: ["node", "nodejs"] },
  { name: "express", label: "Express", category: "framework", aliases: ["expressjs", "express.js"] },
  { name: "fastapi", label: "FastAPI", category: "framework", aliases: [] },
  { name: "django", label: "Django", category: "framework", aliases: [] },
  { name: "flask", label: "Flask", category: "framework", aliases: [] },
  { name: "rails", label: "Ruby on Rails", category: "framework", aliases: ["ruby on rails", "ror"] },
  { name: "spring", label: "Spring", category: "framework", aliases: ["springboot", "spring boot"] },
  { name: "graphql", label: "GraphQL", category: "framework", aliases: ["gql"] },
  { name: "rest", label: "REST APIs", category: "framework", aliases: ["restful", "rest api", "rest apis"] },
  { name: "grpc", label: "gRPC", category: "framework", aliases: [] },

  // databases
  { name: "postgresql", label: "PostgreSQL", category: "database", aliases: ["postgres", "psql", "pg"] },
  { name: "mysql", label: "MySQL", category: "database", aliases: [] },
  { name: "mongodb", label: "MongoDB", category: "database", aliases: ["mongo"] },
  { name: "redis", label: "Redis", category: "database", aliases: [] },
  { name: "elasticsearch", label: "Elasticsearch", category: "database", aliases: ["elastic"] },
  { name: "supabase", label: "Supabase", category: "database", aliases: [] },
  { name: "snowflake", label: "Snowflake", category: "database", aliases: [] },
  { name: "bigquery", label: "BigQuery", category: "database", aliases: [] },
  { name: "dynamodb", label: "DynamoDB", category: "database", aliases: [] },
  { name: "sqlite", label: "SQLite", category: "database", aliases: [] },

  // cloud
  { name: "aws", label: "AWS", category: "cloud", aliases: ["amazon web services"] },
  { name: "gcp", label: "Google Cloud", category: "cloud", aliases: ["google cloud", "google cloud platform"] },
  { name: "azure", label: "Azure", category: "cloud", aliases: ["microsoft azure"] },
  { name: "vercel", label: "Vercel", category: "cloud", aliases: [] },
  { name: "cloudflare", label: "Cloudflare", category: "cloud", aliases: [] },
  { name: "heroku", label: "Heroku", category: "cloud", aliases: [] },

  // devops
  { name: "docker", label: "Docker", category: "devops", aliases: [] },
  { name: "kubernetes", label: "Kubernetes", category: "devops", aliases: ["k8s"] },
  { name: "terraform", label: "Terraform", category: "devops", aliases: [] },
  { name: "ansible", label: "Ansible", category: "devops", aliases: [] },
  { name: "ci/cd", label: "CI/CD", category: "devops", aliases: ["cicd", "continuous integration", "continuous delivery", "continuous deployment"] },
  { name: "github actions", label: "GitHub Actions", category: "devops", aliases: ["gh actions"] },
  { name: "jenkins", label: "Jenkins", category: "devops", aliases: [] },
  { name: "git", label: "Git", category: "devops", aliases: [] },
  { name: "linux", label: "Linux", category: "devops", aliases: ["unix"] },

  // data + ml
  { name: "pandas", label: "Pandas", category: "data", aliases: [] },
  { name: "numpy", label: "NumPy", category: "data", aliases: [] },
  { name: "spark", label: "Apache Spark", category: "data", aliases: ["pyspark", "apache spark"] },
  { name: "airflow", label: "Airflow", category: "data", aliases: ["apache airflow"] },
  { name: "dbt", label: "dbt", category: "data", aliases: [] },
  { name: "kafka", label: "Kafka", category: "data", aliases: ["apache kafka"] },
  { name: "tensorflow", label: "TensorFlow", category: "ml", aliases: ["tf"] },
  { name: "pytorch", label: "PyTorch", category: "ml", aliases: ["torch"] },
  { name: "scikit-learn", label: "scikit-learn", category: "ml", aliases: ["sklearn"] },
  { name: "llm", label: "LLMs", category: "ml", aliases: ["large language models", "large language model"] },
  { name: "nlp", label: "NLP", category: "ml", aliases: ["natural language processing"] },
  { name: "computer vision", label: "Computer Vision", category: "ml", aliases: ["cv"] },

  // design
  { name: "figma", label: "Figma", category: "design", aliases: [] },
  { name: "ui/ux", label: "UI/UX", category: "design", aliases: ["ui ux", "ux", "ui design", "ux design"] },
  { name: "user research", label: "User Research", category: "design", aliases: [] },
  { name: "prototyping", label: "Prototyping", category: "design", aliases: [] },

  // product
  { name: "agile", label: "Agile", category: "product", aliases: ["agile development"] },
  { name: "scrum", label: "Scrum", category: "product", aliases: [] },
  { name: "jira", label: "Jira", category: "product", aliases: [] },
  { name: "product management", label: "Product Management", category: "product", aliases: ["pm"] },
  { name: "roadmapping", label: "Roadmapping", category: "product", aliases: ["roadmap"] },

  // soft skills
  { name: "leadership", label: "Leadership", category: "soft", aliases: [] },
  { name: "communication", label: "Communication", category: "soft", aliases: [] },
  { name: "mentorship", label: "Mentorship", category: "soft", aliases: ["mentoring"] },
  { name: "collaboration", label: "Collaboration", category: "soft", aliases: [] },

  // tools
  { name: "vscode", label: "VS Code", category: "tool", aliases: ["visual studio code", "vs code"] },
  { name: "intellij", label: "IntelliJ", category: "tool", aliases: ["intellij idea"] },
  { name: "postman", label: "Postman", category: "tool", aliases: [] },
];

/**
 * Lookup index: alias → canonical name. Built once at module load.
 */
const ALIAS_INDEX: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const skill of SKILLS) {
    map.set(skill.name, skill.name);
    for (const alias of skill.aliases) {
      map.set(alias.toLowerCase(), skill.name);
    }
  }
  return map;
})();

const CANONICAL_INDEX: Map<string, CanonicalSkill> = new Map(
  SKILLS.map((s) => [s.name, s])
);

/**
 * Normalize a free-text skill string to its canonical name, or null if unknown.
 *
 * Examples:
 *   normalizeSkill("JS") → "javascript"
 *   normalizeSkill("React.js") → "react"
 *   normalizeSkill("k8s") → "kubernetes"
 *   normalizeSkill("foobar") → null
 */
export function normalizeSkill(input: string): string | null {
  if (!input) return null;
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIAS_INDEX.get(cleaned) ?? null;
}

/** Get the canonical skill record by canonical name. */
export function getSkill(name: string): CanonicalSkill | undefined {
  return CANONICAL_INDEX.get(name.toLowerCase());
}

/** Display label for a canonical skill name (falls back to titlecased input). */
export function skillLabel(name: string): string {
  const skill = CANONICAL_INDEX.get(name.toLowerCase());
  if (skill) return skill.label;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Group canonical skill names by category. Useful for filter UIs.
 */
export function groupByCategory(names: string[]): Record<SkillCategory, string[]> {
  const out: Record<SkillCategory, string[]> = {
    language: [], framework: [], database: [], cloud: [], devops: [],
    data: [], ml: [], design: [], product: [], soft: [], tool: [],
  };
  for (const name of names) {
    const skill = CANONICAL_INDEX.get(name);
    if (skill) out[skill.category].push(name);
  }
  return out;
}

/**
 * Seniority taxonomy. Used for matching candidate seniority to job requirement.
 */
export type SeniorityLevel = "intern" | "junior" | "mid" | "senior" | "staff" | "principal" | "manager" | "director" | "vp" | "c-level";

export const SENIORITY_RANK: Record<SeniorityLevel, number> = {
  intern: 0,
  junior: 1,
  mid: 2,
  senior: 3,
  staff: 4,
  principal: 5,
  manager: 4,
  director: 5,
  vp: 6,
  "c-level": 7,
};

const SENIORITY_PATTERNS: Array<[SeniorityLevel, RegExp]> = [
  ["intern", /\b(intern|internship|co-?op)\b/i],
  ["junior", /\b(junior|jr\.?|associate|entry[- ]level|early career|new grad|graduate)\b/i],
  ["principal", /\b(principal)\b/i],
  ["staff", /\b(staff)\b/i],
  ["c-level", /\b(cto|ceo|cpo|cfo|coo|chief)\b/i],
  ["vp", /\b(vp|vice president)\b/i],
  ["director", /\b(director|head of)\b/i],
  ["manager", /\b(manager|lead engineer|tech lead|engineering lead|em\b)\b/i],
  ["senior", /\b(senior|sr\.?|sde ?iii|swe ?iii|level ?5|l5\b|l6\b)\b/i],
  ["mid", /\b(mid[- ]?level|mid[- ]senior|sde ?ii|swe ?ii|l4\b|level ?4)\b/i],
];

/**
 * Detect seniority level from a job title or text snippet.
 * Returns null when nothing matches confidently — caller can default to "mid".
 */
export function detectSeniority(text: string): SeniorityLevel | null {
  if (!text) return null;
  for (const [level, pattern] of SENIORITY_PATTERNS) {
    if (pattern.test(text)) return level;
  }
  return null;
}
