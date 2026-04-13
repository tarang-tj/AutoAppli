/**
 * Direct Supabase client operations for the `user_resumes` table.
 * RLS policies enforce `auth.uid() = user_id` on all operations.
 */
import { createClient, isSupabaseConfigured } from "./client";

export interface ResumeRow {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  parsed_text: string;
  is_primary: boolean;
  created_at: string;
}

function supabase() {
  return createClient();
}

/** Get the current user's ID from the Supabase session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase().auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/** Fetch all resumes for the current user. */
export async function fetchResumes(): Promise<ResumeRow[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = supabase();
  const { data, error } = await sb
    .from("user_resumes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ResumeRow[];
}

/** Insert a new resume record (after server-side PDF text extraction). */
export async function createResume(params: {
  file_name: string;
  storage_path: string;
  parsed_text: string;
}): Promise<ResumeRow> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const userId = await requireUserId();

  const { data, error } = await supabase()
    .from("user_resumes")
    .insert({
      user_id: userId,
      file_name: params.file_name,
      storage_path: params.storage_path,
      parsed_text: params.parsed_text,
      is_primary: false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ResumeRow;
}

/** Delete a resume by id. */
export async function deleteResume(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase().from("user_resumes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
