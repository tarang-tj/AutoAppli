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
} from "@/types";

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
    const body = `Dear ${who},\n\nThank you for taking the time to discuss the ${title} opportunity at ${co}. I appreciated the conversation and am even more interested in the role.\n\n${notesLine}[Demo draft — connect NEXT_PUBLIC_API_URL for a full AI thank-you note.]\n\nBest regards`;
    pushDemoOutreachMessage({
      id: memId,
      message_type: "email",
      message_purpose: "thank_you",
      recipient_name: b.interviewer_name?.trim() || "Interview thank-you",
      recipient_role: undefined,
      subject,
      body,
      created_at: new Date().toISOString(),
    });
    return {
      subject,
      body,
      saved_outreach_id: memId,
    };
  }
  if (path === "/search") {
    return {
      results: getDemoJobSearchResults(),
      search_id: null,
      persisted: false,
    };
  }
  throw new Error(`Demo mode does not support POST ${path}`);
}

function handleDemoDelete(path: string): void {
  if (path.startsWith("/jobs/")) {
    const jobId = path.split("/")[2];
    setDemoJobs(getDemoJobs().filter((j) => j.id !== jobId));
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
