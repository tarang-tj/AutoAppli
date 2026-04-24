import { NextRequest, NextResponse } from "next/server";
import { generateText } from "../claude";
import { redactPII } from "@/lib/redact-pii";
import { gateAiRoute } from "@/lib/ai-gate";

export async function POST(req: NextRequest) {
  const gate = await gateAiRoute({
    route: "review-resume",
    perRouteMax: 20,
    perRouteWindowMin: 60,
    globalDailyMax: 100,
  });
  if (!gate.ok) return gate.response;

  const started = Date.now();
  try {
    const body = await req.json();
    const { resume_text } = body as { resume_text?: string };

    if (!resume_text?.trim()) {
      return NextResponse.json(
        { error: "resume_text is required" },
        { status: 400 }
      );
    }

    const system = `You are a professional resume reviewer and ATS (Applicant Tracking System) expert. Analyze the resume and return a JSON object with this exact structure (no markdown, no code fences, just raw JSON):
{
  "overall_score": <1-10>,
  "ats_score": <1-10>,
  "strengths": ["..."],
  "improvements": ["..."],
  "ats_issues": ["..."],
  "missing_sections": ["..."],
  "keyword_suggestions": ["..."]
}`;

    const userMessage = `Please review this resume:\n\n${resume_text}`;

    const raw = await generateText({
      system,
      userMessage,
      maxTokens: 2048,
      temperature: 0.3,
    });

    // Parse the JSON response from Claude
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return a structured response from raw text
      parsed = {
        overall_score: 5,
        ats_score: 5,
        strengths: [raw.slice(0, 200)],
        improvements: ["Could not parse structured review. Raw AI feedback provided in strengths."],
        ats_issues: [],
        missing_sections: [],
        keyword_suggestions: [],
      };
    }

    await gate.log({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      durationMs: Date.now() - started,
      status: 200,
    });

    return NextResponse.json({
      id: `rev-${Date.now()}`,
      overall_score: Math.max(1, Math.min(10, parsed.overall_score || 5)),
      ats_score: Math.max(1, Math.min(10, parsed.ats_score || 5)),
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      ats_issues: parsed.ats_issues || [],
      missing_sections: parsed.missing_sections || [],
      keyword_suggestions: parsed.keyword_suggestions || [],
    });
  } catch (err) {
    await gate.log({ durationMs: Date.now() - started, status: 500 });
    console.error("review-resume error:", redactPII(err instanceof Error ? err.message : String(err)));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
