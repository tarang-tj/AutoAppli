import { createClient } from "./client";
import type { TimelineEvent } from "@/types";

const supabase = () => createClient();

export async function fetchTimelineEvents(jobId?: string): Promise<TimelineEvent[]> {
  let q = supabase().from("timeline_events").select("*").order("created_at", { ascending: false });
  if (jobId) q = q.eq("job_id", jobId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as TimelineEvent[];
}

export async function createTimelineEvent(input: Partial<TimelineEvent>): Promise<TimelineEvent> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("timeline_events")
    .insert({ ...input, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as TimelineEvent;
}

export async function deleteTimelineEvent(id: string): Promise<void> {
  const { error } = await supabase().from("timeline_events").delete().eq("id", id);
  if (error) throw error;
}
