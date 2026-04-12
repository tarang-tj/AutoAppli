import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy to the Adzuna Jobs API.
 * Keeps the API key private (never shipped to the browser).
 *
 * POST /api/search
 * Body: { query, location?, remote_only?, job_type?, experience_level?, page?, per_page? }
 */

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID ?? "";
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY ?? "";
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY ?? "us"; // default US

interface AdzunaResult {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string; area?: string[] };
  redirect_url: string;
  description: string;
  created: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  category?: { label: string; tag?: string };
  contract_time?: string; // "full_time" | "part_time"
  contract_type?: string; // "permanent" | "contract"
}

interface AdzunaResponse {
  results: AdzunaResult[];
  count: number;
  mean?: number;
}

function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function mapResult(r: AdzunaResult) {
  return {
    title: r.title.replace(/<\/?[^>]+>/g, ""), // strip HTML tags
    company: r.company?.display_name ?? "Unknown",
    location: r.location?.display_name ?? "",
    url: r.redirect_url,
    snippet: r.description?.replace(/<\/?[^>]+>/g, "").slice(0, 300) ?? "",
    posted_date: r.created ?? undefined,
    closing_date: null,
    salary: formatSalary(r.salary_min, r.salary_max),
    source: "Adzuna",
  };
}

/**
 * Build Adzuna "what" query string with filters baked in.
 */
function buildQuery(
  query: string,
  opts: {
    jobType?: string;
    experienceLevel?: string;
    remoteOnly?: boolean;
  },
): string {
  let q = query.trim();

  // Append experience-level keywords
  if (opts.experienceLevel && opts.experienceLevel !== "all") {
    const EXP_KEYWORDS: Record<string, string> = {
      intern: "intern OR internship OR co-op",
      entry: "junior OR entry-level OR graduate",
      mid: "", // no modifier needed
      senior: "senior OR staff OR principal OR lead",
    };
    const extra = EXP_KEYWORDS[opts.experienceLevel];
    if (extra) q += ` ${extra}`;
  }

  return q;
}

export async function POST(req: NextRequest) {
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    return NextResponse.json(
      { error: "Adzuna API credentials not configured" },
      { status: 503 },
    );
  }

  const body = await req.json();
  const {
    query = "",
    location = "",
    remote_only = false,
    job_type,
    experience_level,
    page = 1,
    per_page = 20,
  } = body as {
    query?: string;
    location?: string;
    remote_only?: boolean;
    job_type?: string;
    experience_level?: string;
    page?: number;
    per_page?: number;
  };

  if (!query.trim()) {
    return NextResponse.json({ results: [], count: 0 });
  }

  // Build URL
  const what = buildQuery(query, { jobType: job_type, experienceLevel: experience_level, remoteOnly: remote_only });
  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_API_KEY,
    results_per_page: String(Math.min(per_page, 50)),
    what,
    "content-type": "application/json",
    sort_by: "relevance",
  });

  if (location.trim()) {
    params.set("where", location.trim());
  }

  // Job type filters
  if (job_type === "full_time") params.set("full_time", "1");
  if (job_type === "part_time") params.set("part_time", "1");
  if (job_type === "contract") params.set("contract", "1");
  if (job_type === "internship") {
    // Adzuna doesn't have a dedicated internship filter, but we already
    // added intern keywords to the query above via experience_level mapping.
    // If experience_level wasn't set, add it now.
    if (!experience_level || experience_level === "all") {
      params.set("what", `${what} intern OR internship`);
    }
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/${page}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // cache 5 min
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[Adzuna] API error:", res.status, text);
      return NextResponse.json(
        { error: `Adzuna API returned ${res.status}` },
        { status: 502 },
      );
    }

    const data: AdzunaResponse = await res.json();
    const results = (data.results ?? []).map(mapResult);

    return NextResponse.json({
      results,
      count: data.count ?? results.length,
      search_id: null,
      persisted: false,
    });
  } catch (err) {
    console.error("[Adzuna] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to reach Adzuna API" },
      { status: 502 },
    );
  }
}
