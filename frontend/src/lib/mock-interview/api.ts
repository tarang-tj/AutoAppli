/**
 * Mock Interview API helpers.
 *
 * Calls the FastAPI backend under /api/v1/mock-interview/*.
 * Uses fetchBackend-style auth injection (Bearer token via Supabase session)
 * mirroring the pattern in frontend/src/lib/api.ts — no reimplemented fetch.
 */

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

// ── Types (mirrors backend Pydantic models) ────────────────────────────────

export interface SessionStartResponse {
  session_id: string;
  question_index: number;
  question: string;
  total: number;
}

export interface TurnResponse {
  feedback: string;
  next_question: string | null;
  question_index: number;
  complete: boolean;
}

export interface DimensionScores {
  clarity: number;
  structure: number;
  specificity: number;
  relevance: number;
}

export interface EndResponse {
  overall: number;
  dimensions: DimensionScores;
  top_strengths: string[];
  top_improvements: string[];
}

export interface TurnRecord {
  question: string;
  answer: string;
  feedback: string;
}

export interface SessionState {
  session_id: string;
  user_id: string | null;
  job_description: string;
  role: string;
  num_questions: number;
  question_index: number;
  questions: string[];
  turns: TurnRecord[];
  complete: boolean;
  scorecard: EndResponse | null;
}

export interface SessionListItem {
  session_id: string;
  role: string;
  complete: boolean;
  overall_score: number | null;
  created_at: string;
}

// ── Internal helpers ───────────────────────────────────────────────────────

function resolveApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return /\/api\/v1$/i.test(raw) ? raw : `${raw}/api/v1`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = resolveApiBase();
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = (err as { detail?: unknown }).detail;
    throw new Error(
      typeof detail === "string" ? detail : `API error ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function startSession(
  jobDescription: string,
  role: string,
  numQuestions: number,
): Promise<SessionStartResponse> {
  return request<SessionStartResponse>("/mock-interview/sessions", {
    method: "POST",
    body: JSON.stringify({
      job_description: jobDescription,
      role,
      num_questions: numQuestions,
    }),
  });
}

export async function submitTurn(
  sessionId: string,
  answer: string,
): Promise<TurnResponse> {
  return request<TurnResponse>(`/mock-interview/sessions/${sessionId}/turn`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export async function endSession(sessionId: string): Promise<EndResponse> {
  return request<EndResponse>(`/mock-interview/sessions/${sessionId}/end`, {
    method: "POST",
  });
}

export async function getSession(sessionId: string): Promise<SessionState> {
  return request<SessionState>(`/mock-interview/sessions/${sessionId}`);
}

export async function listSessions(): Promise<SessionListItem[]> {
  return request<SessionListItem[]>("/mock-interview/sessions");
}
