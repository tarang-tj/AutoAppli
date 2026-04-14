import { createClient } from "./client";
import type { UserProfile } from "@/types";

const supabase = () => createClient();

export async function fetchProfile(): Promise<UserProfile> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    // Auto-create if missing (race condition with trigger)
    const { data: created, error: createErr } = await supabase()
      .from("profiles")
      .upsert({ user_id: user.id, display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "" })
      .select()
      .single();
    if (createErr) throw createErr;
    return mapProfile(created);
  }
  return mapProfile(data);
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const { data: { user } } = await supabase().auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase()
    .from("profiles")
    .update({
      display_name: updates.display_name,
      headline: updates.headline,
      linkedin_url: updates.linkedin_url,
      phone: updates.phone,
      location: updates.location,
      portfolio_url: updates.portfolio_url,
      bio: updates.bio,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;
  return mapProfile(data);
}

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    display_name: (row.display_name as string) || "",
    headline: (row.headline as string) || "",
    linkedin_url: (row.linkedin_url as string) || "",
    phone: (row.phone as string) || "",
    location: (row.location as string) || "",
    portfolio_url: (row.portfolio_url as string) || "",
    bio: (row.bio as string) || "",
    updated_at: (row.updated_at as string) || "",
  };
}
