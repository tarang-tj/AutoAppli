/**
 * Direct Supabase client operations for the `interview_notes` table.
 * Mirrors the pattern used in jobs.ts — no server-side API route needed.
 */
import { createClient } from "./client";
import type { InterviewNote, InterviewPrepMaterial } from "@/types";

function supabase() {
  return createClient();
}

// ── READ ──

export async function fetchInterviews(): Promise<InterviewNote[]> {
  const { data, error } = await supabase()
    .from("interview_notes")
    .select("*")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch interviews: ${error.message}`);
  return (data ?? []) as InterviewNote[];
}

export async function fetchInterview(id: string): Promise<InterviewNote> {
  const { data, error } = await supabase()
    .from("interview_notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch interview: ${error.message}`);
  return data as InterviewNote;
}

// ── CREATE ──

export interface CreateInterviewInput {
  job_id: string;
  round_name?: string;
  scheduled_at?: string | null;
  interviewer_name?: string;
  notes?: string;
  status?: "upcoming" | "completed" | "cancelled";
}

export async function createInterview(
  input: CreateInterviewInput,
): Promise<InterviewNote> {
  const { data, error } = await supabase()
    .from("interview_notes")
    .insert({
      job_id: input.job_id,
      round_name: input.round_name ?? "General",
      scheduled_at: input.scheduled_at ?? null,
      interviewer_name: input.interviewer_name ?? "",
      notes: input.notes ?? "",
      status: input.status ?? "upcoming",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create interview: ${error.message}`);
  return data as InterviewNote;
}

// ── UPDATE ──

export async function updateInterview(
  id: string,
  updates: Partial<Omit<InterviewNote, "id" | "created_at">>,
): Promise<InterviewNote> {
  const { data, error } = await supabase()
    .from("interview_notes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update interview: ${error.message}`);
  return data as InterviewNote;
}

// ── DELETE ──

export async function deleteInterview(id: string): Promise<void> {
  const { error } = await supabase()
    .from("interview_notes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete interview: ${error.message}`);
}
