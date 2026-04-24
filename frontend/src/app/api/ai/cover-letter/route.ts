import { NextRequest, NextResponse } from "next/server";
import { generateText } from "../claude";
import { redactPII } from "@/lib/redact-pii";
import { gateAiRoute } from "@/lib/ai-gate";

export async function POST(req: NextRequest) {
  const gate = await gateAiRoute({
    route: "cover-letter",
    perRouteMax: 10,
    perRouteWindowMin: 60,
    globalDailyMax: 100,
  });
  if (!gate.ok) return gate.response;

  const started = Date.now();
  try {
    const body = await req.json();
    const { job_title, company, job_description, resume_text, tone, instructions } = body as {
      job_title?: string;
      company?: string;
      job_description?: string;
      resume_text?: string;
      tone?: string;
      instructions?: string;
    };

    const system = `You are an expert cover letter writer. Generate personalized, compelling cover letters that highlight relevant skills and experience.

Write in a clear manner matching the specified tone. The cover letter should be 3-4 paragraphs, approximately 250-350 words.

Tone guide:
- professional: formal, business-like language
- enthusiastic: energetic, passionate about the opportunity
- conversational: friendly, personable tone
- formal: very formal, traditional business letter style`;

    const userMessage = `Generate a cover letter with these details:

Job Title: ${job_title || "(not specified)"}
Company: ${company || "(not specified)"}

Job Description:
${job_description || "(not provided)"}

Resume/Background:
${resume_text || "(not provided)"}

${instructions ? `Special Instructions: ${instructions}` : ""}

Tone: ${tone || "professional"}

Write only the cover letter body paragraphs. Do not include greeting or signature — just the main content.`;

    const content = await generateText({
      system,
      userMessage,
      maxTokens: 1024,
      temperature: 0.7,
    });

    await gate.log({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      durationMs: Date.now() - started,
      status: 200,
    });

    return NextResponse.json({
      id: `cl-${Date.now().toString(36)}`,
      job_title: job_title || "",
      company: company || "",
      content,
      tone: tone || "professional",
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    await gate.log({ durationMs: Date.now() - started, status: 500 });
    console.error("cover-letter error:", redactPII(err instanceof Error ? err.message : String(err)));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
