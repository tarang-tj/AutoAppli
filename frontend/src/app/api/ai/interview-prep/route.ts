import { NextRequest, NextResponse } from "next/server";
import { generateText } from "../claude";
import { redactPII } from "@/lib/redact-pii";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job_title, company, job_description, resume_text } = body as {
      job_title?: string;
      company?: string;
      job_description?: string;
      resume_text?: string;
    };

    const system = `You are an expert interview coach. Generate comprehensive interview preparation materials. Return a JSON object with this exact structure (no markdown, no code fences, just raw JSON):
{
  "company_overview": "Brief overview of the company and culture",
  "role_insights": "Key insights about what this role requires",
  "talking_points": ["point 1", "point 2", ...],
  "likely_questions": ["question 1", "question 2", ...],
  "questions_to_ask": ["question 1", "question 2", ...],
  "tips": ["tip 1", "tip 2", ...]
}

Generate 4-6 items for each array field.`;

    const userMessage = `Generate interview preparation materials:

Job Title: ${job_title || "(not specified)"}
Company: ${company || "(not specified)"}
${job_description ? `\nJob Description:\n${job_description.slice(0, 1500)}` : ""}
${resume_text ? `\nCandidate Resume:\n${resume_text.slice(0, 1500)}` : ""}`;

    const raw = await generateText({
      system,
      userMessage,
      maxTokens: 2048,
      temperature: 0.5,
    });

    let parsed;
    try {
      const cleaned = raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        company_overview: `${company || "The company"} is an organization where the ${job_title || "role"} will contribute to team success.`,
        role_insights: raw.slice(0, 300),
        talking_points: ["Discuss your relevant experience", "Highlight measurable achievements"],
        likely_questions: ["Tell me about yourself", "Why this role?", "Walk me through a challenging project"],
        questions_to_ask: ["What does success look like in this role?", "How is the team structured?"],
        tips: ["Research the company beforehand", "Prepare STAR-format answers"],
      };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("interview-prep error:", redactPII(err instanceof Error ? err.message : String(err)));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
