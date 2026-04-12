/**
 * Direct Supabase client operations for the `jobs` table.
 * RLS policies enforce `auth.uid() = user_id` on all operations,
 * so no server-side API route is needed.
 */
import { createClient } from "./client";
import type { Job, JobStatus } from "@/types";

// ── Helpers ──

function supabase() {
  return createClient();
}

/** Get the current user's ID from the Supabase session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase().auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

// ── READ ──

export async function fetchJobs(status?: string): Promise<Job[]> {
  let query = supabase()
    .from("jobs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Job[];
}

export async function fetchJob(id: string): Promise<Job> {
  const { data, error } = await supabase()
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data as Job;
}

// ── CREATE ──

export async function createJob(input: {
  company: string;
  title: string;
  url?: string;
  description?: string;
  source?: string;
  status?: JobStatus;
}): Promise<Job> {
  const userId = await requireUserId();

  // Check for duplicate URL
  if (input.url) {
    const { data: existing } = await supabase()
      .from("jobs")
      .select("id, company, title, url, status, source, sort_order, created_at, updated_at")
      .eq("url", input.url)
      .maybeSingle();

    if (existing) {
      return { ...existing, duplicate: true } as Job;
    }
  }

  // Get max sort_order for the target status column
  const targetStatus = input.status ?? "bookmarked";
  const { data: maxRow } = await supabase()
    .from("jobs")
    .select("sort_order")
    .eq("status", targetStatus)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await supabase()
    .from("jobs")
    .insert({
      user_id: userId,
      company: input.company ?? "",
      title: input.title ?? "",
      url: input.url ?? null,
      description: input.description ?? null,
      status: targetStatus,
      source: input.source ?? "manual",
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Job;
}

// ── UPDATE ──

export async function updateJob(
  id: string,
  updates: Partial<Pick<Job, "company" | "title" | "url" | "description" | "status" | "sort_order" | "notes" | "applied_at">>
): Promise<Job> {
  const { data, error } = await supabase()
    .from("jobs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Job;
}

/** Batch-update sort_order for multiple jobs (used by Kanban drag-and-drop). */
export async function reorderJobs(
  moves: Array<{ id: string; status: string; sort_order: number }>
): Promise<void> {
  const sb = supabase();
  const now = new Date().toISOString();
  // Execute all updates concurrently
  const results = await Promise.all(
    moves.map((m) =>
      sb
        .from("jobs")
        .update({ status: m.status, sort_order: m.sort_order, updated_at: now })
        .eq("id", m.id)
    )
  );
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw new Error(firstError.error.message);
}

// ── DELETE ──

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase().from("jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
