import { createClient } from "./client";
import type { Reminder } from "@/types";

const supabase = () => createClient();

export async function fetchReminders(): Promise<Reminder[]> {
  const { data, error } = await supabase()
    .from("reminders")
    .select("*")
    .order("due_at", { ascending: true });
  if (error) throw error;
  return (data || []) as Reminder[];
}

export async function createReminder(input: Partial<Reminder>): Promise<Reminder> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("reminders")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Reminder;
}

export async function updateReminder(id: string, updates: Partial<Reminder>): Promise<Reminder> {
  const { data, error } = await supabase()
    .from("reminders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Reminder;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase().from("reminders").delete().eq("id", id);
  if (error) throw error;
}
