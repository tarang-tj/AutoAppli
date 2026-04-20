/**
 * Sprint 8 — supabase-direct resume + tailored-doc reads.
 *
 * Replaces the demo fallbacks for `apiGet("/resumes")` and
 * `apiGet("/resumes/generated")` so signed-in users get their real uploaded
 * resumes and their real saved tailored versions.
 *
 * Why read-only here:
 *   - Resume *uploads* still require the FastAPI host (PDF parsing happens
 *     server-side via pdfplumber). When NEXT_PUBLIC_API_URL is unset we keep
 *     the existing demo upload behavior — a placeholder row in the demo
 *     store. A future sprint will wire upload through Supabase Storage +
 *     a Next.js API route that does the PDF→text extraction.
 *   - Tailored doc *generation* runs through the local Anthropic-backed
 *     /api/ai/tailor-resume route already; persistence into Supabase from
 *     the browser is the next step (see sprint follow-ups).
 *
 * Both helpers gate on requireUserId() so an anon visitor (e.g. someone who
 * landed on /dashboard from a marketing page without signing in) gets a
 * clean "Not authenticated" error instead of someone else's data — RLS
 * would catch this anyway, but failing fast is friendlier.
 */
import { createClient } from "./client";
import type { Resume, SavedTailoredDocument } from "@/types";

function supabase() {
  return createClient();
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase().auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/**
 * GET /resumes equivalent. Reads every row in public.user_resumes for the
 * current user, newest first.
 */
export async function fetchResumes(): Promise<Resume[]> {
  await requireUserId();
  const { data, error } = await supabase()
    .from("user_resumes")
    .select("id, file_name, storage_path, parsed_text, is_primary, created_at")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Resume[];
}

/**
 * GET /resumes/generated equivalent. Reads every saved tailored doc for the
 * current user, newest first. Cover letters live in a separate table
 * (cover_letters) and have their own /cover-letter/history endpoint, so we
 * filter to doc_type='tailored_resume' here even though the column allows
 * 'cover_letter' too — keeping the contract identical to the FastAPI route.
 */
export async function fetchGeneratedDocuments(): Promise<
  SavedTailoredDocument[]
> {
  await requireUserId();
  const { data, error } = await supabase()
    .from("generated_documents")
    .select(
      "id, doc_type, title, resume_id, job_description_excerpt, content, created_at",
    )
    .eq("doc_type", "tailored_resume")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SavedTailoredDocument[];
}
