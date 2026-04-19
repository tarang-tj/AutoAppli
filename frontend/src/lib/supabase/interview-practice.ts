/**
 * Direct Supabase client operations for interview_practice_sessions.
 *
 * We persist transcripts client-side rather than through the FastAPI
 * backend so the feature works in Supabase-direct deployments (the
 * production topology — see CLAUDE.md). RLS on the table enforces
 * per-user access, so no service-role key is needed.
 *
 * Caller is expected to gate invocation on isSupabaseConfigured().
 * When Supabase isn't configured (pure demo mode / local dev without
 * env vars), the practice page simply doesn't persist and these
 * helpers are not called.
 */
import { createClient } from "./client";
import type {
  InterviewPracticeMessage,
  InterviewPracticeSession,
} from "@/types";

function supabase() {
  return createClient();
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase().auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ── READ ──

export async function fetchSessions(limit = 25): Promise<InterviewPracticeSession[]> {
  const { data, error } = await supabase()
    .from("interview_practice_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as InterviewPracticeSession[];
}

export async function fetchSession(id: string): Promise<InterviewPracticeSession> {
  const { data, error } = await supabase()
    .from("interview_practice_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as InterviewPracticeSession;
}

// ── CREATE ──

export interface CreateSessionInput {
  job_id?: string | null;
  job_title: string;
  company: string;
  job_description?: string | null;
  resume_snapshot?: string | null;
  messages: InterviewPracticeMessage[];
}

export async function createSession(
  input: CreateSessionInput
): Promise<InterviewPracticeSession> {
  const userId = await requireUserId();
  const { data, error } = await supabase()
    .from("interview_practice_sessions")
    .insert({
      user_id: userId,
      job_id: input.job_id ?? null,
      job_title: input.job_title,
      company: input.company,
      job_description: input.job_description ?? null,
      resume_snapshot: input.resume_snapshot ?? null,
      messages: input.messages,
      turn_count: input.messages.length,
      ended: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as InterviewPracticeSession;
}

// ── UPDATE ──

/**
 * Patch a session in place. Typical call after each chat turn lands:
 *
 *   await updateSession(id, { messages: nextMessages });
 *
 * Or on end-of-session:
 *
 *   await updateSession(id, { messages: nextMessages, ended: true });
 */
export async function updateSession(
  id: string,
  updates: { messages?: InterviewPracticeMessage[]; ended?: boolean }
): Promise<InterviewPracticeSession> {
  const patch: Record<string, unknown> = {};
  if (updates.messages) {
    patch.messages = updates.messages;
    patch.turn_count = updates.messages.length;
  }
  if (typeof updates.ended === "boolean") {
    patch.ended = updates.ended;
  }
  // The DB trigger maintains updated_at; no need to set it client-side.

  const { data, error } = await supabase()
    .from("interview_practice_sessions")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as InterviewPracticeSession;
}

// ── DELETE ──

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase()
    .from("interview_practice_sessions")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
