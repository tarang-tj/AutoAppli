import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/parse-pdf
 * Accepts a PDF file via FormData and returns extracted text.
 * Uses unpdf — a serverless-friendly PDF text extraction library
 * that works reliably on Vercel without worker setup.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Use unpdf — works reliably in Vercel serverless (no worker setup needed)
    const { extractText } = await import("unpdf");
    const { text, totalPages } = await extractText(uint8);

    const cleaned = (text || "").trim();

    return NextResponse.json({
      text: cleaned,
      pages: totalPages ?? 0,
      chars: cleaned.length,
    });
  } catch (err) {
    console.error("parse-pdf error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF parse failed" },
      { status: 500 }
    );
  }
}
