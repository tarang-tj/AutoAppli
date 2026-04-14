import { createClient } from "./client";
import type { Compensation } from "@/types";

const supabase = () => createClient();

export async function fetchCompensations(jobId?: string): Promise<Compensation[]> {
  let q = supabase().from("compensations").select("*").order("created_at", { ascending: false });
  if (jobId) q = q.eq("job_id", jobId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Compensation[];
}

export async function createCompensation(input: Partial<Compensation>): Promise<Compensation> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("compensations")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Compensation;
}

export async function updateCompensation(id: string, updates: Partial<Compensation>): Promise<Compensation> {
  const { data, error } = await supabase()
    .from("compensations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Compensation;
}

export async function deleteCompensation(id: string): Promise<void> {
  const { error } = await supabase().from("compensations").delete().eq("id", id);
  if (error) throw error;
}
