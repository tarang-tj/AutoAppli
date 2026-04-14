import { createClient } from "./client";
import type { OutreachMessage, OutreachMessagePurpose } from "@/types";

const supabase = () => createClient();

export async function fetchOutreachMessages(): Promise<OutreachMessage[]> {
  const { data, error } = await supabase()
    .from("outreach_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapMessage);
}

export async function createOutreachMessage(input: {
  message_type: string;
  recipient_name: string;
  recipient_role?: string;
  subject?: string;
  body: string;
  message_purpose?: string;
  job_title?: string;
  company?: string;
  job_description?: string;
}): Promise<OutreachMessage> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("outreach_messages")
    .insert({
      user_id: user.id,
      message_type: input.message_type,
      recipient_name: input.recipient_name,
      recipient_role: input.recipient_role || null,
      subject: input.subject || null,
      body: input.body,
      message_purpose: input.message_purpose || "outreach",
      job_title: input.job_title || "",
      company: input.company || "",
      job_description: input.job_description || "",
    })
    .select()
    .single();
  if (error) throw error;
  return mapMessage(data);
}

export async function deleteOutreachMessage(id: string): Promise<void> {
  const { error } = await supabase().from("outreach_messages").delete().eq("id", id);
  if (error) throw error;
}

function mapMessage(row: Record<string, unknown>): OutreachMessage {
  return {
    id: row.id as string,
    message_type: ((row.message_type as string) || "email") as "email" | "linkedin",
    recipient_name: (row.recipient_name as string) || "",
    recipient_role: (row.recipient_role as string) || undefined,
    subject: (row.subject as string) || undefined,
    body: (row.body as string) || "",
    message_purpose: ((row.message_purpose as string) || "outreach") as OutreachMessagePurpose,
    created_at: (row.created_at as string) || new Date().toISOString(),
  };
}
