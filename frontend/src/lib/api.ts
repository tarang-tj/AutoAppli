import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getDemoJobs,
  setDemoJobs,
  getDemoResumes,
  setDemoResumes,
  getDemoOutreachMessages,
  getDemoJobSearchResults,
  getDemoProfile,
  setDemoProfile,
  getDemoGeneratedDocuments,
  pushDemoGeneratedDocument,
  removeDemoGeneratedDocument,
  pushDemoOutreachMessage,
  removeDemoOutreachMessage,
  getDemoInterviewNotes,
  pushDemoInterviewNote,
  removeDemoInterviewNote,
  getDemoReminders,
  pushDemoReminder,
  updateDemoReminder,
  removeDemoReminder,
  getDemoCompensations,
  pushDemoCompensation,
  updateDemoCompensation,
  removeDemoCompensation,
  getDemoContacts,
  pushDemoContact,
  updateDemoContact,
  removeDemoContact,
  getDemoTimelineEvents,
  pushDemoTimelineEvent,
  removeDemoTimelineEvent,
} from "@/lib/demo-data";
import { normalizeJobUrl } from "@/lib/job-url";
import { sortJobsKanbanOrder } from "@/lib/kanban-reorder";
import type {
  Job,
  Resume,
  OutreachMessage,
  GeneratedDocument,
  ResumeReview,
  UserProfile,
  AnalyticsData,
  MatchScore,
  MatchScoresResponse,
  InterviewNote,
  InterviewPrepMaterial,
  Reminder,
  Compensation,
  CRMContact,
  TimelineEvent,
} from "@/types";

function computeDemoAnalytics(jobs: Job[]): AnalyticsData {
  const total = jobs.length;
  const STATUS_ORDER = ["bookmarked", "applied", "interviewing", "offer", "rejected", "ghosted"];
  const counts: Record<string, number> = {};
  for (const s of STATUS_ORDER) counts[s] = 0;
  for (const j of jobs) counts[j.status] = (counts[j.status] || 0) + 1;

  const funnel = STATUS_ORDER.map((s) => ({ stage: s, count: counts[s] || 0 }));

  const appliedTotal = jobs.filter((j) =>
    ["applied", "interviewing", "offer", "rejected", "ghosted"].includes(j.status)
  ).length;
  const interviewingTotal = jobs.filter((j) =>
    ["interviewing", "offer"].includes(j.status)
  ).length;
  const offerTotal = counts["offer"] || 0;
  const rejectedTotal = counts["rejected"] || 0;
  const ghostedTotal = counts["ghosted"] || 0;

  const rate = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  const conversions = {
    bookmarked_to_applied: rate(appliedTotal, total),
    applied_to_interviewing: rate(interviewingTotal, appliedTotal),
    interviewing_to_offer: rate(offerTotal, interviewingTotal),
    rejection_rate: rate(rejectedTotal, appliedTotal),
    ghost_rate: rate(ghostedTotal, appliedTotal),
  };

  const daysBetween = (a: string, b: string) =>
    Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000 * 10) / 10;

  const bToA: number[] = [];
  const aToL: number[] = [];
  const lifecycle: number[] = [];
  for (const j of jobs) {
    if (j.applied_at && j.created_at) bToA.push(daysBetween(j.created_at, j.applied_at));
    if (j.applied_at && j.updated_at && ["interviewing", "offer", "rejected", "ghosted"].includes(j.status))
      aToL.push(daysBetween(j.applied_at, j.updated_at));
    if (j.created_at && j.updated_at) lifecycle.push(daysBetween(j.created_at, j.updated_at));
  }
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

  const sourceCounts: Record<string, number> = {};
  for (const j of jobs) sourceCounts[j.source] = (sourceCounts[j.source] || 0) + 1;
  const sources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({ source, count }));

  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const weeklyActivity = Array.from({ length: 8 }, (_, i) => {
    const w = 7 - i;
    const end = now - w * WEEK;
    const start = end - WEEK;
    const count = jobs.filter((j) => {
      const t = new Date(j.created_at).getTime();
      return t >= start && t < end;
    }).length;
    return {
      week_start: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      week_end: new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      jobs_added: count,
    };
  });

  const companyCounts: Record<string, number> = {};
  for (const j of jobs) if (j.company) companyCounts[j.company] = (companyCounts[j.company] || 0) + 1;
  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([company, count]) => ({ company, count }));

  const responded = jobs.filter((j) => ["interviewing", "offer", "rejected"].includes(j.status)).length;

  return {
    total_jobs: total,
    funnel,
    conversions,
    avg_durations_days: {
      bookmarked_to_applied: avg(bToA),
      applied_to_latest: avg(aToL),
      total_lifecycle: avg(lifecycle),
    },
    sources,
    weekly_activity: weeklyActivity,
    top_companies: topCompanies,
    response_rate: rate(responded, appliedTotal),
    summary: {
      active_applications: appliedTotal - rejectedTotal - ghostedTotal,
      interviews_in_progress: counts["interviewing"] || 0,
      offers: offerTotal,
      rejections: rejectedTotal,
    },
  };
}

const MATCH_SKILL_TERMS = new Set([
  "python","java","javascript","typescript","react","angular","vue","node",
  "express","django","flask","fastapi","sql","nosql","mongodb","postgresql",
  "docker","kubernetes","aws","gcp","azure","terraform","git","linux",
  "rest","graphql","kafka","spark","airflow","dbt","tableau","looker",
  "excel","r","scala","go","rust","figma","jira","agile","scrum",
  "analytics","machine","learning","tensorflow","pytorch","nlp","llm",
  "data","pipeline","etl","warehouse","snowflake","bigquery","pandas",
  "numpy","html","css","tailwind","nextjs","supabase","firebase",
  "leadership","collaboration","strategy","operations","management","metrics",
]);

const MATCH_STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","have","has","had",
  "do","does","did","will","would","could","should","may","might","can",
  "this","that","these","those","it","its","i","we","you","they","he",
  "she","my","your","our","their","what","which","who","where","when",
  "how","not","no","if","then","than","so","as","up","out","about",
  "into","over","after","before","between","under","above","such",
  "each","every","all","any","both","few","more","most","other","some",
  "very","just","also","too","only","own","same","new","well","now",
  "even","way","part","able","like","year","years","work","working",
  "experience","role","team","company","join","looking","ideal",
  "candidate","including","using","across","etc","strong","highly",
  "key","based","within",
]);

function computeDemoMatchScore(resumeText: string, jobDescription: string): MatchScore {
  const tokenize = (t: string) => (t.toLowerCase().match(/[a-z][a-z0-9+#/.]+/g) || []);
  const extract = (text: string) => {
    const counts: Record<string, number> = {};
    for (const t of tokenize(text)) {
      if (MATCH_STOP_WORDS.has(t) || t.length < 2) continue;
      counts[t] = (counts[t] || 0) + (MATCH_SKILL_TERMS.has(t) ? 3 : 1);
    }
    return counts;
  };

  if (!resumeText || !jobDescription) {
    return { score: 0, matched_keywords: [], missing_keywords: [], top_job_keywords: [] };
  }

  const jdKw = extract(jobDescription);
  const resumeKw = extract(resumeText);
  const topJd = Object.entries(jdKw).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k]) => k);
  const matched = topJd.filter((k) => k in resumeKw);
  const missing = topJd.filter((k) => !(k in resumeKw));
  const totalW = topJd.reduce((s, k) => s + (jdKw[k] || 0), 0);
  const matchedW = matched.reduce((s, k) => s + (jdKw[k] || 0), 0);
  const score = totalW > 0 ? Math.min(100, Math.max(0, Math.round((matchedW / totalW) * 120))) : 0;

  return {
    score,
    matched_keywords: matched.slice(0, 15),
    missing_keywords: missing.slice(0, 10),
    top_job_keywords: topJd.slice(0, 20),
  };
}

function computeDemoMatchScores(resumeText: string, jobs: Job[]): MatchScoresResponse {
  const scores: Record<string, MatchScore> = {};
  for (const job of jobs) {
    scores[job.id] = computeDemoMatchScore(resumeText, job.description || "");
  }
  return { scores };
}

const MISSING_API_URL =
  "Set NEXT_PUBLIC_API_URL to your deployed API (e.g. https://your-api.onrender.com). No default URL is used.";

/** FastAPI mounts under `/api/v1`. Env may be origin only or full `.../api/v1`. */
function resolveApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  if (/\/api\/v1$/i.test(raw)) return raw;
  return `${raw}/api/v1`;
}

const API_URL = resolveApiBaseUrl();

/** True when the FastAPI base URL is set (resumes, jobs, outreach when wired to backend). */
export function isResumeApiConfigured(): boolean {
  return Boolean(API_URL);
}

/** GET `/api/v1/health` — for UI connectivity checks (browser fetch; requires CORS on the API). */
export async function checkApiHealth(): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const res = await fetch(`${API_URL}/health`, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Alias: jobs use the same API base as resumes. */
export const isJobsApiConfigured = isResumeApiConfigured;

function isJobsListPath(path: string): boolean {
  return path === "/jobs" || path.startsWith("/jobs?");
}

function isJobsDetailPath(path: string): boolean {
  return /^\/jobs\/[^/]+$/.test(path);
}

/** Resume routes can use FastAPI (when configured) or in-browser demo session. */
function resumePathUsesBackend(path: string): boolean {
  return path === "/resumes" || path.startsWith("/resumes/");
}

function handleDemoResumeUpload(formData: FormData): Resume {
  const file = formData.get("file");
  const fileName =
    file instanceof File ? file.name : "uploaded_resume.pdf";
  const resume: Resume = {
    id: `resume-${Date.now()}`,
    file_name: fileName,
    storage_path: `resumes/${fileName}`,
    parsed_text:
      "[Demo upload — no API] PDF text was not extracted. Use “Load sample resumes” for full sample text, or set NEXT_PUBLIC_API_URL for real parsing.\n\n" +
      `Uploaded file: ${fileName}`,
    is_primary: false,
    created_at: new Date().toISOString(),
  };
  setDemoResumes([...getDemoResumes(), resume]);
  return resume;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (!isSupabaseConfigured()) {
    return {};
  }
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatApiDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg: string }).msg)
          : JSON.stringify(item)
      )
      .join("; ");
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: string }).message);
  }
  return "API error";
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      formatApiDetail((error as { detail?: unknown }).detail) || res.statusText
    );
  }
  return res.json();
}

async function fetchBackend<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error(MISSING_API_URL);
  }
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  return handleResponse(res) as Promise<T>;
}

function handleDemoGet(path: string): unknown {
  if (path === "/jobs") {
    return sortJobsKanbanOrder(getDemoJobs());
  }
  {
    const m = path.match(/^\/jobs\/([^/]+)$/);
    if (m) {
      const job = getDemoJobs().find((j) => j.id === m[1]);
      if (!job) {
        throw new Error("Job not found");
      }
      return job;
    }
  }
  if (path.startsWith("/jobs?status=")) {
    const status = new URLSearchParams(path.split("?")[1]).get("status");
    return sortJobsKanbanOrder(
      getDemoJobs().filter((j) => j.status === status)
    );
  }
  if (path === "/resumes") {
    return getDemoResumes();
  }
  if (path === "/outreach") {
    return getDemoOutreachMessages();
  }
  if (path === "/profile") {
    return getDemoProfile();
  }
  if (path === "/resumes/generated") {
    return getDemoGeneratedDocuments();
  }
  if (path === "/analytics") {
    return computeDemoAnalytics(getDemoJobs());
  }
  if (path === "/interviews") {
    return getDemoInterviewNotes();
  }
  if (path.startsWith("/interviews?job_id=")) {
    const jobId = new URLSearchParams(path.split("?")[1]).get("job_id");
    return getDemoInterviewNotes().filter((n) => n.job_id === jobId);
  }
  if (path === "/notifications/reminders" || path.startsWith("/notifications/reminders?")) {
    return getDemoReminders();
  }
  if (path === "/salary") {
    return getDemoCompensations();
  }
  if (path.startsWith("/salary?job_id=")) {
    const jobId = new URLSearchParams(path.split("?")[1]).get("job_id");
    return getDemoCompensations().filter((c) => c.job_id === jobId);
  }
  if (path === "/contacts") {
    return getDemoContacts();
  }
  if (path.startsWith("/contacts?job_id=")) {
    const jobId = new URLSearchParams(path.split("?")[1]).get("job_id");
    return getDemoContacts().filter((c) => c.job_id === jobId);
  }
  if (path.startsWith("/timeline/")) {
    const jobId = path.split("/")[2];
    // Build demo timeline from existing data
    const jobs = getDemoJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return [];
    const interviews = getDemoInterviewNotes().filter((n) => n.job_id === jobId);
    const contacts = getDemoContacts().filter((c) => c.job_id === jobId);
    const events: TimelineEvent[] = [];
    // Job created
    events.push({
      id: `evt-auto-created-${jobId}`,
      job_id: jobId,
      event_type: "status_change",
      title: "Job bookmarked",
      description: `Added ${job.title} at ${job.company} to tracker`,
      occurred_at: job.created_at,
    });
    if (job.applied_at) {
      events.push({
        id: `evt-auto-applied-${jobId}`,
        job_id: jobId,
        event_type: "application_sent",
        title: "Application submitted",
        description: `Applied for ${job.title} at ${job.company}`,
        occurred_at: job.applied_at,
      });
    }
    if (["offer", "rejected", "ghosted", "interviewing"].includes(job.status)) {
      const labels: Record<string, string> = { offer: "Offer received", rejected: "Application rejected", ghosted: "No response", interviewing: "Moved to interviewing" };
      events.push({
        id: `evt-auto-status-${jobId}`,
        job_id: jobId,
        event_type: job.status === "offer" ? "offer_received" : "status_change",
        title: labels[job.status] || job.status,
        description: job.notes || "",
        occurred_at: job.updated_at,
      });
    }
    for (const iv of interviews) {
      events.push({
        id: `evt-auto-iv-${iv.id}`,
        job_id: jobId,
        event_type: iv.status === "completed" ? "interview_completed" : "interview_scheduled",
        title: iv.round_name,
        description: iv.interviewer_name ? `with ${iv.interviewer_name}` : "",
        occurred_at: iv.scheduled_at || iv.created_at,
      });
    }
    for (const ct of contacts) {
      events.push({
        id: `evt-auto-ct-${ct.id}`,
        job_id: jobId,
        event_type: "contact_added",
        title: `Contact: ${ct.name}`,
        description: `${ct.role} — ${ct.relationship}`,
        occurred_at: ct.created_at,
      });
    }
    // Add manual events
    for (const evt of getDemoTimelineEvents()) {
      if (evt.job_id === jobId) events.push(evt);
    }
    events.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    return events;
  }
  if (path === "/salary/compare") {
    const entries = getDemoCompensations();
    if (!entries.length) return { entries: [], best_total_id: null, best_base_id: null, average_total: 0, count: 0 };
    const best_total = entries.reduce((a, b) => (a.total_compensation > b.total_compensation ? a : b));
    const best_base = entries.reduce((a, b) => (a.base_salary > b.base_salary ? a : b));
    const avg = entries.reduce((s, e) => s + e.total_compensation, 0) / entries.length;
    return {
      entries: [...entries].sort((a, b) => b.total_compensation - a.total_compensation),
      best_total_id: best_total.id,
      best_base_id: best_base.id,
      average_total: Math.round(avg * 100) / 100,
      count: entries.length,
    };
  }
  throw new Error(`Demo mode does not support GET ${path}`);
}

function handleDemoPost(path: string, body?: unknown): unknown {
  if (path === "/jobs") {
    const b = body as {
      company?: string;
      title?: string;
      url?: string;
      description?: string;
      source?: string;
      fetch_full_description?: boolean;
    };
    const jobs = getDemoJobs();
    const normUrl = normalizeJobUrl(b.url);
    if (normUrl) {
      const dup = jobs.find((j) => j.url === normUrl);
      if (dup) {
        return { ...dup, duplicate: true };
      }
    }
    let description = b.description;
    if (b.fetch_full_description && normUrl) {
      description = [
        description,
        "[Demo] Full posting text would be scraped from this URL for resume tailoring.",
        "Responsibilities, requirements, and benefits would appear here.",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    const bookmarked = jobs.filter((j) => j.status === "bookmarked");
    const maxOrd = bookmarked.length
      ? Math.max(...bookmarked.map((j) => j.sort_order ?? 0))
      : -1;
    const newJob: Job = {
      id: `job-${Date.now()}`,
      company: b.company ?? "",
      title: b.title ?? "",
      url: normUrl,
      description,
      status: "bookmarked",
      sort_order: maxOrd + 1,
      source: b.source ?? "manual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    jobs.push(newJob);
    setDemoJobs(sortJobsKanbanOrder(jobs));
    return newJob;
  }
  if (path === "/resumes/upload") {
    const resume: Resume = {
      id: `resume-${Date.now()}`,
      file_name: "uploaded_resume.pdf",
      storage_path: "resumes/uploaded_resume.pdf",
      parsed_text: "Sample uploaded resume content",
      is_primary: false,
      created_at: new Date().toISOString(),
    };
    setDemoResumes([...getDemoResumes(), resume]);
    return resume;
  }
  if (path === "/resumes/generate") {
    const b = body as {
      job_description?: string;
      resume_text?: string;
      resume_id?: string;
    };
    const jd = (b.job_description ?? "").trim() || "(no job description)";
    const source = (b.resume_text ?? "").trim();
    const doc: GeneratedDocument = {
      id: `doc-${Date.now()}`,
      doc_type: "tailored_resume",
      content: [
        "Alex Morgan",
        "alex@example.com | (555) 010-2030 | linkedin.com/in/alexmorgan",
        "",
        "PROFESSIONAL SUMMARY",
        "DEMO OUTPUT — set NEXT_PUBLIC_API_URL for real Claude tailoring and a downloadable PDF.",
        "Target role context (excerpt):",
        jd.slice(0, 380) + (jd.length > 380 ? "…" : ""),
        "",
        "EXPERIENCE",
        "- Shipped features aligned with job keywords from the posting you pasted.",
        "- Collaborated cross-functionally; metrics and outcomes would appear here in a real run.",
        "",
        "SKILLS",
        "Keywords from your resume excerpt: " +
          (source.slice(0, 120) || "(upload a resume)") +
          (source.length > 120 ? "…" : ""),
        "",
        "EDUCATION",
        "Your education section would be tailored to match the role.",
      ].join("\n"),
      storage_path: "",
      download_url: "",
      pdf_base64: null,
    };
    pushDemoGeneratedDocument(doc, b.job_description ?? "", b.resume_id ?? "");
    return doc;
  }
  if (path === "/resumes/review") {
    const b = body as { resume_text?: string };
    const excerpt = (b.resume_text ?? "").trim().slice(0, 400);
    const review: ResumeReview = {
      id: `rev-${Date.now()}`,
      overall_score: 7,
      ats_score: 6,
      strengths: [
        "Demo feedback only — set NEXT_PUBLIC_API_URL for a full Claude review.",
        excerpt ? `Your resume excerpt mentions: "${excerpt.slice(0, 120)}${excerpt.length > 120 ? "…" : ""}"` : "Upload or select a resume with parsed text for context.",
      ],
      improvements: [
        "Tie bullets to outcomes (%, $, time saved).",
        "Mirror 5–8 keywords from a target job description.",
      ],
      ats_issues: [
        "Demo mode cannot analyze formatting or file structure.",
      ],
      missing_sections: [],
      keyword_suggestions: ["cross-functional collaboration", "measurable impact"],
    };
    return review;
  }
  if (path === "/outreach/generate") {
    const b = body as {
      message_type?: string;
      recipient_name?: string;
      recipient_role?: string;
      job_title?: string;
      company?: string;
    };
    const msg: OutreachMessage = {
      id: `msg-${Date.now()}`,
      message_type: (b.message_type === "linkedin" ? "linkedin" : "email"),
      message_purpose: "outreach",
      recipient_name: b.recipient_name ?? "",
      recipient_role: b.recipient_role,
      subject:
        b.message_type === "linkedin"
          ? undefined
          : `Excited about the ${b.job_title || "opportunity"} role at ${b.company || "your company"}`,
      body:
        `Hi ${b.recipient_name ?? ""},\n\nI was impressed by your work and the ${b.job_title || "role"} position at ${b.company || "your organization"}. ` +
        `With my experience, I believe I could make a great contribution to your team.\n\nLooking forward to connecting!\n\nBest regards`,
      created_at: new Date().toISOString(),
    };
    pushDemoOutreachMessage(msg);
    return msg;
  }
  if (path === "/outreach/thank-you") {
    const b = body as {
      job_title?: string;
      company?: string;
      interviewer_name?: string;
      interview_notes?: string;
    };
    const title = (b.job_title ?? "the role").trim() || "the role";
    const co = (b.company ?? "your company").trim() || "your company";
    const who = b.interviewer_name?.trim() || "there";
    const notesLine = b.interview_notes?.trim()
      ? `I especially enjoyed our discussion about: ${b.interview_notes.trim().slice(0, 400)}\n\n`
      : "";
    const memId = `msg-${Date.now()}`;
    const subject = `Thank you — ${title} interview`;
    const emailBody = `Dear ${who},\n\nThank you for taking the time to discuss the ${title} opportunity at ${co}. I appreciated the conversation and am even more interested in the role.\n\n${notesLine}[Demo draft — connect NEXT_PUBLIC_API_URL for a full AI thank-you note.]\n\nBest regards`;
    pushDemoOutreachMessage({
      id: memId,
      message_type: "email",
      message_purpose: "thank_you",
      recipient_name: b.interviewer_name?.trim() || "Interview thank-you",
      recipient_role: undefined,
      subject,
      body: emailBody,
      created_at: new Date().toISOString(),
    });
    return {
      subject,
      body: emailBody,
      saved_outreach_id: memId,
    };
  }
  if (path === "/match/scores") {
    const b = body as { resume_text?: string };
    return computeDemoMatchScores(b.resume_text || "", getDemoJobs());
  }
  if (path === "/search") {
    return {
      results: getDemoJobSearchResults(),
      search_id: null,
      persisted: false,
    };
  }
  if (path === "/interviews") {
    const b = body as Partial<InterviewNote> & { job_id: string };
    const now = new Date().toISOString();
    const note: InterviewNote = {
      id: `int-${Date.now().toString(36)}`,
      job_id: b.job_id,
      round_name: b.round_name || "General",
      scheduled_at: b.scheduled_at || null,
      interviewer_name: b.interviewer_name || "",
      notes: b.notes || "",
      prep_material: b.prep_material || null,
      status: "upcoming",
      created_at: now,
      updated_at: now,
    };
    return pushDemoInterviewNote(note);
  }
  if (path === "/contacts") {
    const b = body as Partial<CRMContact> & { name: string };
    const now = new Date().toISOString();
    const contact: CRMContact = {
      id: `contact-${Date.now().toString(36)}`,
      job_id: b.job_id || null,
      name: b.name,
      role: b.role || "",
      company: b.company || "",
      email: b.email || "",
      phone: b.phone || "",
      linkedin_url: b.linkedin_url || "",
      relationship: b.relationship || "recruiter",
      notes: b.notes || "",
      last_contacted_at: null,
      interactions: [],
      created_at: now,
      updated_at: now,
    };
    return pushDemoContact(contact);
  }
  if (path === "/timeline") {
    const b = body as Partial<TimelineEvent> & { job_id: string };
    const now = new Date().toISOString();
    const evt: TimelineEvent = {
      id: `evt-${Date.now().toString(36)}`,
      job_id: b.job_id,
      event_type: b.event_type || "note",
      title: b.title || "",
      description: b.description || "",
      occurred_at: b.occurred_at || now,
      created_at: now,
    };
    return pushDemoTimelineEvent(evt);
  }
  if (path === "/notifications/reminders") {
    const b = body as Partial<Reminder>;
    const now = new Date().toISOString();
    const rem: Reminder = {
      id: `rem-${Date.now().toString(36)}`,
      job_id: b.job_id || null,
      reminder_type: b.reminder_type || "custom",
      title: b.title || "Reminder",
      message: b.message || "",
      due_at: b.due_at || null,
      is_read: false,
      is_dismissed: false,
      created_at: now,
      updated_at: now,
    };
    return pushDemoReminder(rem);
  }
  if (path === "/salary") {
    const b = body as Partial<Compensation>;
    const now = new Date().toISOString();
    const total = (b.base_salary || 0) + (b.bonus || 0) + (b.equity_value || 0) + (b.signing_bonus || 0) + (b.benefits_value || 0);
    const comp: Compensation = {
      id: `comp-${Date.now().toString(36)}`,
      job_id: b.job_id || null,
      base_salary: b.base_salary || 0,
      bonus: b.bonus || 0,
      equity_value: b.equity_value || 0,
      signing_bonus: b.signing_bonus || 0,
      benefits_value: b.benefits_value || 0,
      total_compensation: total,
      currency: b.currency || "USD",
      pay_period: b.pay_period || "annual",
      notes: b.notes || "",
      created_at: now,
      updated_at: now,
    };
    return pushDemoCompensation(comp);
  }
  if (path === "/interviews/prep") {
    const b = body as { job_title?: string; company?: string };
    const demoPrep: InterviewPrepMaterial = {
      company_overview: `${b?.company || "This company"} is a leading technology company known for innovation and strong engineering culture.`,
      role_insights: `The ${b?.job_title || "role"} typically involves cross-functional collaboration, technical problem-solving, and delivering impact through data-driven decisions.`,
      talking_points: [
        "Highlight relevant project experience that aligns with the role",
        "Discuss a time you solved a complex technical challenge",
        "Show understanding of the company's product and market position",
        "Demonstrate leadership through collaboration examples",
      ],
      likely_questions: [
        "Tell me about yourself and your background",
        "Why are you interested in this role at our company?",
        "Describe a challenging project you led and the outcome",
        "How do you handle disagreements with team members?",
        "Where do you see yourself in 3-5 years?",
        "What's your approach to learning new technologies?",
      ],
      questions_to_ask: [
        "What does a typical day look like in this role?",
        "How does the team measure success?",
        "What are the biggest challenges facing the team right now?",
        "What opportunities for growth and learning are available?",
      ],
      tips: [
        "Research recent company news, product launches, and earnings",
        "Prepare 3-4 STAR stories (Situation, Task, Action, Result)",
        "Practice explaining your resume concisely in 2 minutes",
      ],
    };
    return { prep: demoPrep };
  }
  throw new Error(`Demo mode does not support POST ${path}`);
}

function handleDemoDelete(path: string): void {
  if (path.startsWith("/jobs/")) {
    const jobId = path.split("/")[2];
    setDemoJobs(getDemoJobs().filter((j) => j.id !== jobId));
    return;
  }
  if (path.startsWith("/interviews/")) {
    const noteId = path.split("/")[2];
    removeDemoInterviewNote(noteId);
    return;
  }
  if (path.startsWith("/contacts/")) {
    const contactId = path.split("/")[2];
    removeDemoContact(contactId);
    return;
  }
  if (path.startsWith("/timeline/")) {
    const evtId = path.split("/")[2];
    removeDemoTimelineEvent(evtId);
    return;
  }
  if (path.startsWith("/notifications/reminders/")) {
    const remId = path.split("/")[3];
    removeDemoReminder(remId);
    return;
  }
  if (path.startsWith("/salary/")) {
    const compId = path.split("/")[2];
    removeDemoCompensation(compId);
    return;
  }
  throw new Error(`Demo mode does not support DELETE ${path}`);
}

function handleDemoPatch(path: string, body?: unknown): unknown {
  if (path === "/profile") {
    const b = body as Partial<UserProfile>;
    return setDemoProfile({
      ...(typeof b.display_name === "string" ? { display_name: b.display_name } : {}),
      ...(typeof b.headline === "string" ? { headline: b.headline } : {}),
      ...(typeof b.linkedin_url === "string" ? { linkedin_url: b.linkedin_url } : {}),
    });
  }
  if (path.startsWith("/jobs/")) {
    const jobId = path.split("/")[2];
    const jobs = getDemoJobs();
    const jobIndex = jobs.findIndex((j) => j.id === jobId);
    if (jobIndex === -1) {
      throw new Error("Job not found");
    }
    const b = body as { status?: Job["status"]; notes?: string | null };
    const row = { ...jobs[jobIndex] };
    const now = new Date().toISOString();
    if (b.status !== undefined) {
      const nextStatus = b.status;
      if (nextStatus !== row.status) {
        const others = jobs.filter(
          (j, i) => i !== jobIndex && j.status === nextStatus
        );
        const maxOrd = others.length
          ? Math.max(...others.map((j) => j.sort_order ?? 0))
          : -1;
        row.status = nextStatus;
        row.sort_order = maxOrd + 1;
      }
    }
    if (b.notes !== undefined) {
      row.notes = b.notes === null || b.notes === "" ? undefined : b.notes;
    }
    row.updated_at = now;
    jobs[jobIndex] = row;
    setDemoJobs(sortJobsKanbanOrder(jobs));
    return jobs[jobIndex];
  }
  if (path.startsWith("/interviews/")) {
    const noteId = path.split("/")[2];
    const notes = getDemoInterviewNotes();
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) throw new Error("Interview note not found");
    const b = body as Partial<InterviewNote>;
    const updated = { ...notes[idx], ...b, updated_at: new Date().toISOString() };
    notes[idx] = updated;
    return updated;
  }
  if (path.startsWith("/contacts/")) {
    const contactId = path.split("/")[2];
    const b = body as Partial<CRMContact>;
    const result = updateDemoContact(contactId, b);
    if (!result) throw new Error("Contact not found");
    return result;
  }
  if (path.startsWith("/notifications/reminders/")) {
    const remId = path.split("/")[3];
    const b = body as Partial<Reminder>;
    const result = updateDemoReminder(remId, b);
    if (!result) throw new Error("Reminder not found");
    return result;
  }
  if (path.startsWith("/salary/")) {
    const compId = path.split("/")[2];
    const b = body as Partial<Compensation>;
    const result = updateDemoCompensation(compId, b);
    if (!result) throw new Error("Compensation entry not found");
    return result;
  }
  throw new Error(`Demo mode does not support PATCH ${path}`);
}

function handleDemoPut(path: string, body: unknown): unknown {
  if (path !== "/jobs/reorder") {
    throw new Error(`Demo mode does not support PUT ${path}`);
  }
  const parsed = body as {
    status?: Job["status"];
    ordered_ids?: string[];
  };
  const status = parsed.status;
  const orderedIds = parsed.ordered_ids;
  if (!status || !Array.isArray(orderedIds)) {
    throw new Error("Invalid reorder body");
  }
  const now = new Date().toISOString();
  const jobs = getDemoJobs();
  const next = jobs.map((j) => {
    const idx = orderedIds.indexOf(j.id);
    if (j.status === status && idx >= 0) {
      return { ...j, sort_order: idx, updated_at: now };
    }
    return j;
  });
  setDemoJobs(sortJobsKanbanOrder(next));
  return { ok: true };
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  if (path === "/profile") {
    if (!API_URL) {
      return getDemoProfile() as T;
    }
    return fetchBackend<T>(path);
  }

  if (path === "/search/history" || path.startsWith("/search/history?")) {
    if (!API_URL) {
      return [] as T;
    }
    return fetchBackend<T>(path);
  }

  if (path.startsWith("/search/runs/") && path.endsWith("/results")) {
    if (!API_URL) {
      return {
        results: [],
        search_id: null,
        from_cache: true,
        persisted: false,
      } as T;
    }
    return fetchBackend<T>(path);
  }

  if (path === "/analytics") {
    if (!API_URL) {
      return handleDemoGet(path) as T;
    }
    return fetchBackend<T>(path);
  }

  if (path === "/interviews" || path.startsWith("/interviews?")) {
    if (!API_URL) {
      return handleDemoGet(path) as T;
    }
    return fetchBackend<T>(path);
  }

  if (path === "/notifications/reminders" || path.startsWith("/notifications/reminders?")) {
    if (!API_URL) {
      return handleDemoGet(path) as T;
    }
    return fetchBackend<T>(path);
  }

  if (path === "/salary" || path.startsWith("/salary?") || path === "/salary/compare") {
    if (!API_URL) {
      return handleDemoGet(path) as T;
    }
    return fetchBackend<T>(path);
  }

  if (path === "/contacts" || path.startsWith("/contacts?")) {
    if (!API_URL) {
      return handleDemoGet(path) as T;
    }
    return fetchBackend<T>(path);
  }

  if (path.startsWith("/timeline/")) {
    if (!API_URL) {
      return handleDemoGet(path) as T;
    }
    return fetchBackend<T>(path);
  }

  if ((isJobsListPath(path) || isJobsDetailPath(path)) && !API_URL) {
    return handleDemoGet(path) as T;
  }

  if (resumePathUsesBackend(path)) {
    if (!API_URL) {
      if (path === "/resumes") {
        return getDemoResumes() as T;
      }
      if (path === "/resumes/generated") {
        return getDemoGeneratedDocuments() as T;
      }
      throw new Error(MISSING_API_URL);
    }
    try {
      return await fetchBackend<T>(path);
    } catch {
      if (path === "/resumes") {
        return getDemoResumes() as T;
      }
      if (path === "/resumes/generated") {
        return [] as T;
      }
      throw new Error(
        path === "/resumes"
          ? "Could not load resumes. Check NEXT_PUBLIC_API_URL and that your API is reachable."
          : "Resume API unreachable. Verify NEXT_PUBLIC_API_URL and API health."
      );
    }
  }

  if (!isSupabaseConfigured()) {
    return handleDemoGet(path) as T;
  }

  return fetchBackend<T>(path);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  if (path === "/jobs" && !API_URL) {
    return handleDemoPost(path, body) as T;
  }

  if (path === "/outreach/thank-you" && !API_URL) {
    return handleDemoPost(path, body) as T;
  }

  if ((path === "/interviews" || path === "/interviews/prep") && !API_URL) {
    return handleDemoPost(path, body) as T;
  }

  if (path === "/contacts" && !API_URL) {
    return handleDemoPost(path, body) as T;
  }

  if (path === "/timeline" && !API_URL) {
    return handleDemoPost(path, body) as T;
  }

  if (path === "/notifications/reminders" && !API_URL) {
    return handleDemoPost(path, body) as T;
  }

  if (path === "/salary" && !API_URL) {
    return handleDemoPost(path, body) as T;
  }

  if (resumePathUsesBackend(path)) {
    if (!API_URL) {
      return handleDemoPost(path, body) as T;
    }
    return fetchBackend<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  if (!isSupabaseConfigured()) {
    return handleDemoPost(path, body) as T;
  }

  return fetchBackend<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPostFormData<T = unknown>(path: string, formData: FormData): Promise<T> {
  if (resumePathUsesBackend(path)) {
    if (!API_URL) {
      if (path === "/resumes/upload") {
        return handleDemoResumeUpload(formData) as T;
      }
      void formData;
      return handleDemoPost(path) as T;
    }
    const headers = await getAuthHeaders();
    return fetchBackend<T>(path, {
      method: "POST",
      headers,
      body: formData,
    });
  }

  if (!isSupabaseConfigured()) {
    void formData;
    return handleDemoPost(path) as T;
  }

  const headers = await getAuthHeaders();
  return fetchBackend<T>(path, {
    method: "POST",
    headers,
    body: formData,
  });
}

export async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  if (path !== "/jobs/reorder") {
    throw new Error(`Unsupported PUT ${path}`);
  }
  if (!API_URL) {
    return handleDemoPut(path, body) as T;
  }
  return fetchBackend<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  if (path === "/profile") {
    if (!API_URL) {
      return handleDemoPatch(path, body) as T;
    }
    return fetchBackend<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  if (path.startsWith("/jobs/") && !API_URL) {
    return handleDemoPatch(path, body) as T;
  }

  if (path.startsWith("/interviews/") && !API_URL) {
    return handleDemoPatch(path, body) as T;
  }

  if (path.startsWith("/contacts/") && !API_URL) {
    return handleDemoPatch(path, body) as T;
  }

  if (path.startsWith("/notifications/reminders/") && !API_URL) {
    return handleDemoPatch(path, body) as T;
  }

  if (path.startsWith("/salary/") && !API_URL) {
    return handleDemoPatch(path, body) as T;
  }

  if (!isSupabaseConfigured()) {
    return handleDemoPatch(path, body) as T;
  }

  return fetchBackend<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<void> {
  if (path.startsWith("/interviews/") && !API_URL) {
    handleDemoDelete(path);
    return;
  }

  if (path.startsWith("/interviews/") && API_URL) {
    await fetchBackend(path, { method: "DELETE" });
    return;
  }

  if (path.startsWith("/contacts/") && !API_URL) {
    handleDemoDelete(path);
    return;
  }

  if (path.startsWith("/contacts/") && API_URL) {
    await fetchBackend(path, { method: "DELETE" });
    return;
  }

  if (path.startsWith("/timeline/") && !API_URL) {
    handleDemoDelete(path);
    return;
  }

  if (path.startsWith("/timeline/") && API_URL) {
    await fetchBackend(path, { method: "DELETE" });
    return;
  }

  if (path.startsWith("/notifications/reminders/") && !API_URL) {
    handleDemoDelete(path);
    return;
  }

  if (path.startsWith("/notifications/reminders/") && API_URL) {
    await fetchBackend(path, { method: "DELETE" });
    return;
  }

  if (path.startsWith("/salary/") && path !== "/salary/compare" && !API_URL) {
    handleDemoDelete(path);
    return;
  }

  if (path.startsWith("/salary/") && path !== "/salary/compare" && API_URL) {
    await fetchBackend(path, { method: "DELETE" });
    return;
  }

  if (path.startsWith("/jobs/") && !API_URL) {
    handleDemoDelete(path);
    return;
  }

  if (path.startsWith("/jobs/") && API_URL) {
    await fetchBackend(path, { method: "DELETE" });
    return;
  }

  if (path.startsWith("/resumes/generated/")) {
    const id = path.slice("/resumes/generated/".length).split("/")[0];
    if (!id) {
      throw new Error("Invalid document id");
    }
    if (!API_URL) {
      removeDemoGeneratedDocument(id);
      return;
    }
    await fetchBackend(path, { method: "DELETE" });
    return;
  }

  if (path.startsWith("/outreach/") && path.length > "/outreach/".length) {
    const id = path.slice("/outreach/".length).split("/")[0];
    if (!id) {
      throw new Error("Invalid message id");
    }
    if (!API_URL) {
      removeDemoOutreachMessage(id);
      return;
    }
    await fetchBackend(path, { method: "DELETE" });
    return;
  }

  if (!isSupabaseConfigured()) {
    return;
  }
  if (!API_URL) {
    throw new Error(MISSING_API_URL);
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(formatApiDetail((error as { detail?: unknown }).detail) || res.statusText);
  }
}
