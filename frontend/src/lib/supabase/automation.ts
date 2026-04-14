import { createClient } from "./client";
import type { AutomationRule } from "@/types";

const supabase = () => createClient();

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  const { data, error } = await supabase()
    .from("automation_rules")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as AutomationRule[];
}

export async function createAutomationRule(input: Partial<AutomationRule>): Promise<AutomationRule> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("automation_rules")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as AutomationRule;
}

export async function updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
  const { data, error } = await supabase()
    .from("automation_rules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AutomationRule;
}

export async function deleteAutomationRule(id: string): Promise<void> {
  const { error } = await supabase().from("automation_rules").delete().eq("id", id);
  if (error) throw error;
}
