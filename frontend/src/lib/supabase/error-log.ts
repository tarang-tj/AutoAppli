/**
 * Pre-Sprint-9 instrumentation — fire-and-forget client error log.
 *
 * Wraps an insert into public.client_errors. Designed so wiring it into a
 * catch branch never makes the original failure worse:
 *   - Never throws (every code path is `.catch(() => {})`-wrapped).
 *   - Returns synchronously (callers don't have to await).
 *   - No-ops when Supabase isn't configured (demo mode / local dev without
 *     env vars set).
 *   - Truncates message+stack defensively so a 1MB stack trace can't blow
 *     out the row size.
 *
 * The user_id is pulled from auth.getUser() best-effort — if that fails or
 * the user is anon, the row goes in with user_id=null (which is what the
 * client_errors_insert_anon RLS policy expects).
 */
import { createClient, isSupabaseConfigured } from "./client";

const MAX_MESSAGE_LEN = 2_000;
const MAX_STACK_LEN = 8_000;

function safeStringify(value: unknown, max: number): string {
  try {
    const str = typeof value === "string" ? value : String(value);
    return str.length > max ? str.slice(0, max) + "…[truncated]" : str;
  } catch {
    return "[unstringifiable]";
  }
}

function currentRoute(): string {
  if (typeof window === "undefined") return "ssr";
  // pathname + search is plenty; the hash isn't useful for grouping.
  return window.location.pathname + window.location.search;
}

function currentUserAgent(): string | null {
  if (typeof navigator === "undefined") return null;
  return navigator.userAgent.slice(0, 500);
}

export interface ErrorLogContext {
  /** Override the auto-detected route (use when logging from an SSR or background context). */
  route?: string;
  /** Free-form key/value bag — job_id, resume_id, etc. */
  context?: Record<string, unknown>;
}

/**
 * Log a client-side error to public.client_errors. Never throws, never
 * blocks. Safe to call from any catch branch — including the catch branch
 * of an already-degraded API call.
 */
export function logClientError(
  err: unknown,
  opts: ErrorLogContext = {},
): void {
  if (!isSupabaseConfigured()) return;
  if (typeof window === "undefined") return; // server-side errors go through the API route

  const message = safeStringify(
    err instanceof Error ? err.message : err,
    MAX_MESSAGE_LEN,
  );
  const stack =
    err instanceof Error && err.stack
      ? safeStringify(err.stack, MAX_STACK_LEN)
      : null;

  const route = opts.route ?? currentRoute();
  const user_agent = currentUserAgent();
  const context = opts.context ?? {};

  // Fire-and-forget. We use the awaited form internally so a thrown error
  // inside the supabase client (e.g. network down) gets swallowed instead of
  // becoming an unhandled rejection.
  void (async () => {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData?.user?.id ?? null;
      await supabase
        .from("client_errors")
        .insert({ user_id, route, message, stack, user_agent, context });
    } catch {
      // Intentionally empty — error logging must never become the new error.
    }
  })();
}
