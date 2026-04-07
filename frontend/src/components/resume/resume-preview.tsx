"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GeneratedDocument } from "@/types";
import { Download, FileText } from "lucide-react";

export function ResumePreview({ document: doc }: { document: GeneratedDocument | null }) {
  if (!doc) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 h-full min-h-[400px] flex items-center justify-center">
        <CardContent className="text-center">
          <FileText className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500">Your tailored resume will appear here</p>
          <p className="text-zinc-600 text-sm mt-1">
            Upload a resume and paste a job description to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasPdfUrl =
    Boolean(doc.download_url?.trim()) &&
    doc.download_url !== "" &&
    !doc.download_url.startsWith("/api/download");

  const hasPdfBase64 = Boolean(doc.pdf_base64?.trim());

  const downloadPdfFromBase64 = () => {
    const b64 = doc.pdf_base64;
    if (!b64?.trim()) return;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = globalThis.document.createElement("a");
    a.href = url;
    a.download = `tailored-resume-${doc.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-white text-lg">Generated Resume</CardTitle>
        {hasPdfUrl ? (
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 shrink-0"
            onClick={() => window.open(doc.download_url, "_blank")}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        ) : hasPdfBase64 ? (
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 shrink-0"
            onClick={downloadPdfFromBase64}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {doc.content ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-h-[560px] overflow-y-auto">
            <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
              {doc.content}
            </pre>
          </div>
        ) : hasPdfUrl ? (
          <div className="bg-zinc-800 rounded-lg p-4 min-h-[400px]">
            <iframe
              src={doc.download_url}
              className="w-full h-[500px] rounded"
              title="Resume Preview"
            />
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">
            No preview text returned. Ensure the API has{" "}
            <code className="text-zinc-400">ANTHROPIC_API_KEY</code> set and try again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
