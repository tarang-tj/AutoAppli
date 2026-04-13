import { NextRequest, NextResponse } from "next/server";
import { generateText } from "../claude";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { resume_text } = body as { resume_text?: string };

    if (!resume_text?.trim()) {
      return NextResponse.json(
        { error: "resume_text is required" },
        { status: 400 }
      );
    }

    const system = `You are a professional resume reviewer and ATS (Applicant Tracking System) expert with 15+ years of recruiting experience. Analyze the resume thoroughly and return a JSON object with this exact structure (no markdown, no code fences, just raw JSON):
{
  "overall_score": <1-10>,
  "ats_score": <1-10>,
  "strengths": ["specific strength 1", "specific strength 2", ...],
  "improvements": ["actionable improvement 1", "actionable improvement 2", ...],
  "ats_issues": ["specific ATS issue 1", ...],
  "missing_sections": ["section name 1", ...],
  "keyword_suggestions": ["keyword 1", "keyword 2", ...]
}

SCORING GUIDE:
- 1-3: Major issues, needs complete rewrite
- 4-5: Below average, significant improvements needed
- 6-7: Good but has clear areas for improvement
- 8-9: Strong resume with minor tweaks needed
- 10: Exceptional, near-perfect

Be specific and actionable in your feedback. Instead of "improve formatting", say exactly what to fix. Instead of "add more keywords", suggest which specific keywords. Each improvement should be a concrete action the user can take.`;

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
    console.error("review-resume error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
