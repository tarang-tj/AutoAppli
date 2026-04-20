/**
 * Pre-Sprint-9 instrumentation — user feedback submission.
 *
 * Inserts a row into public.feedback. Both authed and anon visitors can
 * submit (per the anon/authed RLS policies in 20260422120100_feedback.sql).
 * Throws on failure so the widget can show a toast — unlike logClientError,
 * feedback IS a user-triggered action and silent failure would be
 * frustrating.
 */
import { createClient, isSupabaseConfigured } from "./client";

export type FeedbackCategory = "bug" | "idea" | "confused" | "other";

export interface FeedbackPayload {
  category: FeedbackCategory;
  message: string;
  /** Override the auto-detected route (rarely needed). */
  route?: string;
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase isn't configured — feedback can't be submitted.");
  }

  const route =
    payload.route ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "unknown");
  const user_agent =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null;

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id ?? null;

  const { error } = await supabase.from("feedback").insert({
    user_id,
    category: payload.category,
    message: payload.message.trim(),
    route,
    user_agent,
  });

  if (error) throw new Error(error.message);
}
