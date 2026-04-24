import { NextRequest, NextResponse } from "next/server";
import { generateText } from "../claude";
import { redactPII } from "@/lib/redact-pii";
import { gateAiRoute } from "@/lib/ai-gate";

export async function POST(req: NextRequest) {
  const gate = await gateAiRoute({
    route: "thank-you",
    perRouteMax: 15,
    perRouteWindowMin: 60,
    globalDailyMax: 100,
  });
  if (!gate.ok) return gate.response;

  const started = Date.now();
  try {
    const body = await req.json();
    const { job_title, company, interviewer_name, interview_notes } = body as {
      job_title?: string;
      company?: string;
      interviewer_name?: string;
      interview_notes?: string;
    };

    const system = `You are a professional communication expert. Write a post-interview thank-you email. Include a subject line on the first line prefixed with "Subject: ", then a blank line, then the email body. Be warm, professional, and reference specific discussion points when available.`;

    const userMessage = `Write a thank-you email after an interview:

Job Title: ${job_title || "(not specified)"}
Company: ${company || "(not specified)"}
Interviewer: ${interviewer_name || "(not specified)"}
${interview_notes ? `\nNotes from the interview:\n${interview_notes}` : ""}

Make it personal and genuine, referencing the role and any discussion points provided.`;

    const raw = await generateText({
      system,
      userMessage,
      maxTokens: 1024,
      temperature: 0.6,
    });

    let subject: string;
    let emailBody: string;

    if (raw.startsWith("Subject:")) {
      const lines = raw.split("\n");
      subject = lines[0].replace(/^Subject:\s*/, "").trim();
      emailBody = lines.slice(1).join("\n").trim();
    } else {
      subject = `Thank you — ${job_title || "Interview"} at ${company || "your company"}`;
      emailBody = raw.trim();
    }

    await gate.log({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      durationMs: Date.now() - started,
      status: 200,
    });

    return NextResponse.json({
      subject,
      body: emailBody,
      saved_outreach_id: `msg-${Date.now()}`,
    });
  } catch (err) {
    await gate.log({ durationMs: Date.now() - started, status: 500 });
    console.error("thank-you error:", redactPII(err instanceof Error ? err.message : String(err)));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
