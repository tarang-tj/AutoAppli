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

    const system = `You are an expert resume writer and ATS optimization specialist. Your job is to rewrite the user's resume to be tailored for a specific role.

CRITICAL RULES:
1. Keep ALL facts truthful — NEVER invent experience, skills, credentials, or job titles.
2. ONLY use skills and technologies that appear in the original resume.
3. Reorganize, reword, and emphasize relevant skills and achievements that match the job.
4. Use strong action verbs and quantify achievements where the original data supports it.
5. Optimize for ATS keyword matching by naturally incorporating relevant terms from the job description.
6. Keep the resume concise — aim for 1-2 pages max.

OUTPUT FORMAT — use this exact structure with plain text:
- First line: Full name (all caps)
- Second line: Contact info (email | phone | location | LinkedIn — whatever was in original)
- Then a blank line
- Then sections with UPPERCASE headers followed by content
- Use bullet points (•) for achievements
- Separate sections with blank lines

Example section:
PROFESSIONAL EXPERIENCE
Company Name — Job Title | Start – End
• Achievement with quantified impact
• Another achievement

IMPORTANT: Output ONLY the resume text. No commentary, no "Here is your tailored resume", no markdown formatting. Just the resume itself.`;

    const userMessage = `Here is my current resume:\n\n${resume_text}\n\n---\n\nTarget job description:\n${job_description || "(none provided)"}\n\n${instructions ? `Additional instructions: ${instructions}` : ""}\n\nPlease rewrite my resume to be tailored for this role.`;

    const content = await generateText({
      system,
      userMessage,
      maxTokens: 4096,
      temperature: 0.4,
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
