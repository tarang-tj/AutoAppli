import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/parse-pdf
 * Accepts a PDF file via FormData and returns extracted text.
 * Uses pdfjs-dist (server-side, no canvas needed).
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

    // Dynamic import to avoid build issues with pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const doc = await pdfjsLib.getDocument({ data: uint8 }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items
        .filter((item) => "str" in item && typeof (item as Record<string, unknown>).str === "string")
        .map((item) => (item as Record<string, unknown>).str as string);
      pages.push(strings.join(" "));
    }

    const text = pages.join("\n\n").trim();

    return NextResponse.json({
      text,
      pages: doc.numPages,
      chars: text.length,
    });
  } catch (err) {
    console.error("parse-pdf error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF parse failed" },
      { status: 500 }
    );
  }
}
