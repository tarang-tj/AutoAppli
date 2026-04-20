/**
 * Sprint 8 — supabase-direct profile access.
 *
 * In production AutoAppli runs without a FastAPI host, so apiGet("/profile")
 * and apiPatch("/profile") used to fall through to the demo store. That meant
 * a signed-in real user always saw `{display_name: "", headline: "", linkedin_url: ""}`
 * (the demo seed) and any edits they made on /settings disappeared on reload.
 *
 * These two helpers read/write public.profiles for the current session user
 * via the anon-key client. RLS on profiles ensures auth.uid() = user_id.
 *
 * Shape note: `public.profiles` was extended in
 * 20260421120000_profile_extended.sql with phone, location, portfolio_url,
 * bio, remote_preference. We map them 1:1 to the UserProfile interface and
 * leave anything missing as null (frontend treats null === "not filled in").
 */
import { createClient } from "./client";
import type { UserProfile } from "@/types";

function supabase() {
  return createClient();
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase().auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/** Empty profile returned when the user has no row yet. Matches the demo seed. */
const EMPTY_PROFILE: UserProfile = {
  display_name: "",
  headline: "",
  linkedin_url: "",
  phone: null,
  location: null,
  portfolio_url: null,
  bio: null,
  remote_preference: null,
  updated_at: null,
};

/** Whitelist of writable columns. Anything outside this set is dropped. */
const WRITABLE_KEYS = [
  "display_name",
  "headline",
  "linkedin_url",
  "phone",
  "location",
  "portfolio_url",
  "bio",
  "remote_preference",
] as const;

type WritableKey = (typeof WRITABLE_KEYS)[number];

/** Coerce a Supabase row to the canonical UserProfile shape. */
function rowToProfile(
  row: Record<string, unknown> | null | undefined,
): UserProfile {
  if (!row) return EMPTY_PROFILE;
  const remote = row.remote_preference;
  return {
    display_name: typeof row.display_name === "string" ? row.display_name : "",
    headline: typeof row.headline === "string" ? row.headline : "",
    linkedin_url: typeof row.linkedin_url === "string" ? row.linkedin_url : "",
    phone: typeof row.phone === "string" ? row.phone : null,
    location: typeof row.location === "string" ? row.location : null,
    portfolio_url:
      typeof row.portfolio_url === "string" ? row.portfolio_url : null,
    bio: typeof row.bio === "string" ? row.bio : null,
    remote_preference:
      remote === "remote" || remote === "hybrid" || remote === "onsite"
        ? remote
        : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

/**
 * GET /profile equivalent. Returns an empty profile (not an error) when the
 * row doesn't exist yet — matches the FastAPI behavior where the backend
 * lazily creates a profile row on first PATCH.
 */
export async function fetchProfile(): Promise<UserProfile> {
  const userId = await requireUserId();
  const { data, error } = await supabase()
    .from("profiles")
    .select(
      "display_name, headline, linkedin_url, phone, location, portfolio_url, bio, remote_preference, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return rowToProfile(data as Record<string, unknown> | null);
}

/**
 * PATCH /profile equivalent. Upserts so the very first save also creates
 * the row. Only writes keys present in `patch` — undefined fields are left
 * alone, mirroring Pydantic's exclude_unset=True behavior on the backend.
 */
export async function updateProfile(
  patch: Partial<UserProfile>,
): Promise<UserProfile> {
  const userId = await requireUserId();

  const row: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  for (const key of WRITABLE_KEYS) {
    const value = patch[key as WritableKey];
    if (value !== undefined) {
      // Empty string → store as empty string for text NOT NULL columns
      // (display_name, headline, linkedin_url default ''); for the nullable
      // extended columns we coerce "" → null to keep the API shape clean.
      if (value === "" && key !== "display_name" && key !== "headline" && key !== "linkedin_url") {
        row[key] = null;
      } else {
        row[key] = value;
      }
    }
  }

  const { data, error } = await supabase()
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select(
      "display_name, headline, linkedin_url, phone, location, portfolio_url, bio, remote_preference, updated_at",
    )
    .single();
  if (error) throw new Error(error.message);
  return rowToProfile(data as Record<string, unknown> | null);
}
