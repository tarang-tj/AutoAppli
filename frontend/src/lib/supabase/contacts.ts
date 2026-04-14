import { createClient } from "./client";
import type { CRMContact } from "@/types";

const supabase = () => createClient();

export async function fetchContacts(jobId?: string): Promise<CRMContact[]> {
  let q = supabase().from("crm_contacts").select("*").order("created_at", { ascending: false });
  if (jobId) q = q.eq("job_id", jobId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as CRMContact[];
}

export async function createContact(input: Partial<CRMContact>): Promise<CRMContact> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("crm_contacts")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as CRMContact;
}

export async function updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact> {
  const { data, error } = await supabase()
    .from("crm_contacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CRMContact;
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase().from("crm_contacts").delete().eq("id", id);
  if (error) throw error;
}
