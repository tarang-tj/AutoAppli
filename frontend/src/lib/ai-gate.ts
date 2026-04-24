import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type GateResult =
  | { ok: true; userId: string; log: (fields: UsageFields) => Promise<void> }
  | { ok: false; response: NextResponse };

export interface UsageFields {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  status?: number;
}

export interface GateOptions {
  route: string;
  perRouteMax: number;
  perRouteWindowMin: number;
  globalDailyMax?: number;
}

/**
 * Guards an /api/ai/* route: requires an authenticated session,
 * enforces per-route and global daily rate limits, and returns a
 * `log()` helper the caller must invoke after generation.
 *
 * Falls open (allows the call) when Supabase env vars are missing,
 * so local dev without Supabase still works.
 */
export async function gateAiRoute(opts: GateOptions): Promise<GateResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return {
      ok: true,
      userId: "dev-no-supabase",
      log: async () => {},
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      ),
    };
  }
  const userId = userData.user.id;

  const { data: perRouteOk } = await supabase.rpc("ai_rate_limit_check", {
    p_user_id: userId,
    p_route: opts.route,
    p_max: opts.perRouteMax,
    p_window_min: opts.perRouteWindowMin,
  });
  if (perRouteOk === false) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Rate limit: max ${opts.perRouteMax} ${opts.route} calls per ${opts.perRouteWindowMin} minutes. Try again soon.`,
        },
        { status: 429 }
      ),
    };
  }

  if (opts.globalDailyMax && opts.globalDailyMax > 0) {
    const { data: globalOk } = await supabase.rpc("ai_rate_limit_global", {
      p_user_id: userId,
      p_max: opts.globalDailyMax,
    });
    if (globalOk === false) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Daily cap reached: max ${opts.globalDailyMax} AI requests per 24 hours.`,
          },
          { status: 429 }
        ),
      };
    }
  }

  async function log(fields: UsageFields): Promise<void> {
    try {
      await supabase.from("ai_usage_log").insert({
        user_id: userId,
        route: opts.route,
        model: fields.model ?? null,
        input_tokens: fields.inputTokens ?? null,
        output_tokens: fields.outputTokens ?? null,
        duration_ms: fields.durationMs ?? null,
        status: fields.status ?? null,
      });
    } catch {
      // Never fail the request because logging failed.
    }
  }

  return { ok: true, userId, log };
}
