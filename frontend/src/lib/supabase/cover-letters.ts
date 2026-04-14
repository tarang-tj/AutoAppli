import { createClient } from "./client";
import type { GeneratedCoverLetter, CoverLetterTone } from "@/types";

const supabase = () => createClient();

export async function fetchCoverLetters(): Promise<GeneratedCoverLetter[]> {
  const { data, error } = await supabase()
    .from("cover_letters")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCoverLetter);
}

export async function createCoverLetter(input: {
  job_title: string;
  company: string;
  tone: CoverLetterTone;
  content: string;
  job_description?: string;
  resume_text?: string;
  instructions?: string;
}): Promise<GeneratedCoverLetter> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("cover_letters")
    .insert({
      user_id: user.id,
      job_title: input.job_title,
      company: input.company,
      tone: input.tone,
      content: input.content,
      job_description: input.job_description || "",
      resume_text: input.resume_text || "",
      instructions: input.instructions || "",
    })
    .select()
    .single();
  if (error) throw error;
  return mapCoverLetter(data);
}

export async function deleteCoverLetter(id: string): Promise<void> {
  const { error } = await supabase().from("cover_letters").delete().eq("id", id);
  if (error) throw error;
}

function mapCoverLetter(row: Record<string, unknown>): GeneratedCoverLetter {
  return {
    id: row.id as string,
    job_title: (row.job_title as string) || "",
    company: (row.company as string) || "",
    tone: (row.tone as CoverLetterTone) || "professional",
    content: (row.content as string) || "",
    created_at: (row.created_at as string) || new Date().toISOString(),
  };
}
