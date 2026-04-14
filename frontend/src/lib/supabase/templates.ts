import { createClient } from "./client";
import type { DocTemplate } from "@/types";

const supabase = () => createClient();

export async function fetchTemplates(): Promise<DocTemplate[]> {
  const { data, error } = await supabase()
    .from("doc_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as DocTemplate[];
}

export async function createTemplate(input: Partial<DocTemplate>): Promise<DocTemplate> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("doc_templates")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as DocTemplate;
}

export async function updateTemplate(id: string, updates: Partial<DocTemplate>): Promise<DocTemplate> {
  const { data, error } = await supabase()
    .from("doc_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as DocTemplate;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase().from("doc_templates").delete().eq("id", id);
  if (error) throw error;
}
