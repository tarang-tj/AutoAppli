import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getDemoJobs,
  setDemoJobs,
  getDemoResumes,
  setDemoResumes,
  getDemoOutreachMessages,
  getDemoJobSearchResults,
} from "@/lib/demo-data";
import type { Job, Resume, OutreachMessage, GeneratedDocument } from "@/types";

/** FastAPI mounts routers under `/api/v1`. Accept env with or without that suffix. */
function resolveApiBaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
  )
    .trim()
    .replace(/\/+$/, "");
  if (/\/api\/v1$/i.test(raw)) {
    return raw;
  }
  return `${raw}/api/v1`;
}

const API_URL = resolveApiBaseUrl();

/** Resume routes use the FastAPI backend so AI upload/generate work without Supabase. */
function useBackendForResumePath(path: string): boolean {
  return path === "/resumes" || path.startsWith("/resumes/");
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
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  return handleResponse(res) as Promise<T>;
}

function handleDemoGet(path: string): unknown {
  if (path === "/jobs") {
    return getDemoJobs();
  }
  if (path.startsWith("/jobs?status=")) {
    const status = new URLSearchParams(path.split("?")[1]).get("status");
    return getDemoJobs().filter((j) => j.status === status);
  }
  if (path === "/resumes") {
    return getDemoResumes();
  }
  if (path === "/outreach") {
    return getDemoOutreachMessages();
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
    };
    const newJob: Job = {
      id: `job-${Date.now()}`,
      company: b.company ?? "",
      title: b.title ?? "",
      url: b.url,
      description: b.description,
      status: "bookmarked",
      source: "manual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const jobs = getDemoJobs();
    jobs.push(newJob);
    setDemoJobs(jobs);
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
    const doc: GeneratedDocument = {
      id: `doc-${Date.now()}`,
      doc_type: "tailored_resume",
      storage_path: `generated/tailored_resume_${Date.now()}.pdf`,
      download_url: `/api/download/generated/tailored_resume_${Date.now()}.pdf`,
    };
    return doc;
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
    return msg;
  }
  if (path === "/search") {
    return getDemoJobSearchResults();
  }
  throw new Error(`Demo mode does not support POST ${path}`);
}

function handleDemoPatch(path: string, body?: unknown): unknown {
  if (path.startsWith("/jobs/")) {
    const jobId = path.split("/")[2];
    const jobs = getDemoJobs();
    const jobIndex = jobs.findIndex((j) => j.id === jobId);
    if (jobIndex === -1) {
      throw new Error("Job not found");
    }
    const status = (body as { status?: Job["status"] }).status ?? jobs[jobIndex].status;
    jobs[jobIndex] = {
      ...jobs[jobIndex],
      status,
      updated_at: new Date().toISOString(),
    };
    setDemoJobs(jobs);
    return jobs[jobIndex];
  }
  throw new Error(`Demo mode does not support PATCH ${path}`);
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  if (useBackendForResumePath(path)) {
    try {
      return await fetchBackend<T>(path);
    } catch {
      if (!isSupabaseConfigured() && path === "/resumes") {
        return getDemoResumes() as T;
      }
      throw new Error(
        path === "/resumes"
          ? "Could not load resumes. Start the API (backend) or configure Supabase."
          : "Resume API unreachable. Is the backend running? " + API_URL
      );
    }
  }

  if (!isSupabaseConfigured()) {
    return handleDemoGet(path) as T;
  }

  return fetchBackend<T>(path);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  if (useBackendForResumePath(path)) {
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
  if (useBackendForResumePath(path)) {
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

export async function apiPatch<T = unknown>(path: string, body: unknown): Promise<T> {
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
  if (!isSupabaseConfigured()) {
    return;
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
