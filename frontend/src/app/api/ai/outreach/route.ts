import { NextRequest, NextResponse } from "next/server";
import { generateText } from "../claude";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message_type,
      recipient_name,
      recipient_role,
      job_title,
      company,
      resume_text,
      job_description,
      applicant_name,
    } = body as {
      message_type?: string;
      recipient_name?: string;
      recipient_role?: string;
      job_title?: string;
      company?: string;
      resume_text?: string;
      job_description?: string;
      applicant_name?: string;
    };

    const isLinkedIn = message_type === "linkedin";

    const system = isLinkedIn
      ? `You are a networking expert. Write a concise, compelling LinkedIn connection request message (under 300 characters) for someone reaching out about a job opportunity. Be personable but professional. Output ONLY the message body, no subject line.`
      : `You are a professional email writer. Write a cold outreach email to a hiring contact about a job opportunity. Include a subject line on the first line prefixed with "Subject: ", then a blank line, then the email body. Be concise, professional, and engaging.`;

    const userMessage = `Write a ${isLinkedIn ? "LinkedIn message" : "cold outreach email"} with these details:

Sender: ${applicant_name || "the applicant"}
Recipient: ${recipient_name || "the contact"}${recipient_role ? ` (${recipient_role})` : ""}
Job Title: ${job_title || "(not specified)"}
Company: ${company || "(not specified)"}
${job_description ? `\nJob Description excerpt:\n${job_description.slice(0, 500)}` : ""}
${resume_text ? `\nSender background excerpt:\n${resume_text.slice(0, 500)}` : ""}`;

    const raw = await generateText({
      system,
      userMessage,
      maxTokens: 1024,
      temperature: 0.7,
    });

    let subject: string | undefined;
    let emailBody: string;

    if (!isLinkedIn && raw.startsWith("Subject:")) {
      const lines = raw.split("\n");
      subject = lines[0].replace(/^Subject:\s*/, "").trim();
      emailBody = lines.slice(1).join("\n").trim();
    } else {
      subject = isLinkedIn
        ? undefined
        : `Interested in the ${job_title || "opportunity"} at ${company || "your company"}`;
      emailBody = raw.trim();
    }

    return NextResponse.json({
      id: `msg-${Date.now()}`,
      message_type: isLinkedIn ? "linkedin" : "email",
      message_purpose: "outreach",
      recipient_name: recipient_name || "",
      recipient_role: recipient_role || null,
      subject,
      body: emailBody,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("outreach error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
