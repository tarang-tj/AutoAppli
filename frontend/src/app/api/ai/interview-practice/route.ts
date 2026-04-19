import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * /api/ai/interview-practice — multi-turn interviewer chat.
 *
 * Why not reuse ./claude.ts's `generateText`?
 *   That helper is shaped for single-shot prompts: you pass `system` +
 *   one `userMessage` and get a string back. This endpoint is *multi-turn*
 *   — Claude needs the running message history each request so it stays
 *   in character and remembers prior answers. We build a thin
 *   per-request client here and send the full transcript each time.
 *
 * Request shape:
 *   {
 *     messages: {role: "user"|"assistant"; content: string}[],
 *     job_title?: string,
 *     company?: string,
 *     job_description?: string,
 *     resume_text?: string
 *   }
 *
 * Response: { reply: string } — the next interviewer turn.
 */

type IncomingMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      job_title,
      company,
      job_description,
      resume_text,
    } = body as {
      messages: IncomingMessage[];
      job_title?: string;
      company?: string;
      job_description?: string;
      resume_text?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 }
      );
    }

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const system = `You are a senior hiring manager at ${
      company || "a company"
    } conducting a screen interview for a ${
      job_title || "role"
    }. Your style is warm but rigorous — you probe for STAR-format stories (Situation, Task, Action, Result) and push for specific, measurable impact.

Rules:
- Ask ONE question at a time. Never multi-part.
- Vary question types across the session: behavioral, technical, hypothetical, culture-fit.
- After each candidate answer, give brief inline feedback (1–2 sentences, start with "💬") BEFORE asking the next question. Separate feedback from the next question with a single blank line.
- Keep every turn under 100 words.
- Stay in character. Never mention that you are an AI or that this is a simulation.
- If the candidate says "end" / "stop" / "that's it", wrap up with a 3–5 bullet debrief titled "Quick debrief:" summarizing strengths, gaps, and what to practice next.
- Your very first turn should be a short warm-up question (e.g., "Walk me through your background and what drew you to this role"). Don't introduce the exercise — dive in.

Context to reference:

— Job description —
${job_description ? job_description.slice(0, 2500) : "(not provided — ask the candidate to describe the role at the start)"}

— Candidate resume —
${resume_text ? resume_text.slice(0, 2500) : "(not provided)"}
`;

    const anthropic = new Anthropic({ apiKey: key });

    // Defensive pass: trim empty messages Claude would reject.
    const cleanedMessages = messages
      .map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content.trim() : "",
      }))
      .filter((m) => m.content.length > 0);

    if (cleanedMessages.length === 0) {
      return NextResponse.json(
        { error: "All messages were empty after trimming." },
        { status: 400 }
      );
    }

    const completion = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 768,
      temperature: 0.7,
      system,
      messages: cleanedMessages,
    });

    const text = completion.content
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? block.text : ""))
      .join("")
      .trim();

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("interview-practice error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal error",
      },
      { status: 500 }
    );
  }
}
