import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasApiUrl: Boolean(process.env.NEXT_PUBLIC_API_URL),
      nodeEnv: process.env.NODE_ENV,
    },
  });
}
