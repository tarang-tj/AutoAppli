import { NextRequest, NextResponse } from "next/server";
import { generateText } from "../claude";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { job_description, resume_text, instructions } = body as {
      job_description?: string;
      resume_text?: string;
      instructions?: string;
    };

    if (!resume_text?.trim()) {
      return NextResponse.json(
        { error: "resume_text is required" },
        { status: 400 }
      );
    }

    const system = `You are an expert resume writer. Rewrite the user's resume to be tailored for the target job description. Keep all facts truthful — do NOT invent experience, skills, or credentials. Reorganize, reword, and emphasize relevant skills and achievements. Output only the resume text, no commentary.`;

    const userMessage = `Here is my current resume:\n\n${resume_text}\n\n---\n\nTarget job description:\n${job_description || "(none provided)"}\n\n${instructions ? `Additional instructions: ${instructions}` : ""}\n\nPlease rewrite my resume to be tailored for this role.`;

    const content = await generateText({
      system,
      userMessage,
      maxTokens: 4096,
      temperature: 0.5,
    });

    return NextResponse.json({
      id: `doc-${Date.now()}`,
      doc_type: "tailored_resume",
      content,
      storage_path: "",
      download_url: "",
      pdf_base64: null,
    });
  } catch (err) {
    console.error("tailor-resume error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
