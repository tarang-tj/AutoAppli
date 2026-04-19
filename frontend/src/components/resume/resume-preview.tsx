"use client";

import { ResumeFormattedView } from "@/components/resume/resume-formatted-view";
import { ResumeDiffView } from "@/components/resume/resume-diff-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadResumeHtml, openResumePrintWindow } from "@/lib/resume-export-html";
import type { GeneratedDocument } from "@/types";
import { Copy, Download, FileText, GitCompareArrows, LayoutTemplate, Printer, ScrollText } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { startTransition, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PreviewTab = "formatted" | "pdf" | "source" | "diff";

function base64ToBlobUrl(b64: string): string | null {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export function ResumePreview({
  document: doc,
  originalText,
}: {
  document: GeneratedDocument | null;
  /**
   * Source resume text used as the "before" side of the diff view. If
   * omitted, the Diff tab is disabled (e.g. when browsing a saved doc
   * without knowing which resume produced it).
   */
  originalText?: string;
}) {
  const [tab, setTab] = useState<PreviewTab>("formatted");
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  const du = doc?.download_url?.trim() ?? "";
  const hasPdfUrl =
    Boolean(du) && du !== "" && !du.startsWith("/api/download");

  const hasPdfBase64 = Boolean(doc?.pdf_base64?.trim());

  useEffect(() => {
    if (!doc?.pdf_base64?.trim()) {
      startTransition(() => setPdfObjectUrl(null));
      return;
    }
    const url = base64ToBlobUrl(doc.pdf_base64);
    startTransition(() => setPdfObjectUrl(url));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc?.id, doc?.pdf_base64]);

  useEffect(() => {
    const u = doc?.download_url?.trim() ?? "";
    const hasRemotePdf = Boolean(u) && !u.startsWith("/api/download");
    const hasB64 = Boolean(doc?.pdf_base64?.trim());
    startTransition(() => {
      if (hasB64 || hasRemotePdf) {
        setTab("pdf");
      } else {
        setTab("formatted");
      }
    });
  }, [doc?.id, doc?.download_url, doc?.pdf_base64]);

  if (!doc) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 h-full min-h-[400px] flex items-center justify-center">
        <CardContent className="text-center">
          <FileText className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-300">Your tailored resume will appear here</p>
          <p className="text-zinc-500 text-sm mt-1 max-w-xs mx-auto leading-relaxed">
            Upload a resume, paste a job description, then generate. You’ll get a formatted preview, PDF
            download, and print-ready layout.
          </p>
        </CardContent>
      </Card>
    );
  }

  const content = doc.content?.trim() ?? "";

  const downloadPdfFromBase64 = () => {
    const b64 = doc.pdf_base64;
    if (!b64?.trim()) return;
    const url = base64ToBlobUrl(b64);
    if (!url) return;
    const a = globalThis.document.createElement("a");
    a.href = url;
    a.download = `tailored-resume-${doc.id}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2_000);
  };

  const pdfIframeSrc = hasPdfUrl ? du : pdfObjectUrl;

  const tabBtn = (value: PreviewTab, label: string, icon: ReactNode, disabled?: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setTab(value)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        tab === value
          ? "bg-zinc-100 text-zinc-900 shadow-sm"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <CardTitle className="text-white text-lg">Generated resume</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {hasPdfUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-600 text-zinc-100 bg-zinc-800/80 hover:bg-zinc-800"
              onClick={() => du && window.open(du, "_blank")}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          ) : hasPdfBase64 ? (
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-600 text-zinc-100 bg-zinc-800/80 hover:bg-zinc-800"
              onClick={downloadPdfFromBase64}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          ) : null}
          {content ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-600 text-zinc-100 bg-zinc-800/80 hover:bg-zinc-800"
                onClick={() => downloadResumeHtml(content, `tailored-resume-${doc.id}.html`)}
              >
                <Download className="h-4 w-4 mr-2" />
                HTML
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-600 text-zinc-100 bg-zinc-800/80 hover:bg-zinc-800"
                onClick={() => openResumePrintWindow(content)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-600 text-zinc-100 bg-zinc-800/80 hover:bg-zinc-800"
                onClick={() => {
                  void navigator.clipboard.writeText(content);
                  toast.success("Resume text copied");
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy text
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div
          className="flex flex-wrap gap-1 rounded-lg bg-zinc-950/80 p-1 border border-zinc-800"
          role="tablist"
          aria-label="Resume preview mode"
        >
          {tabBtn("formatted", "Formatted", <LayoutTemplate className="h-4 w-4" />)}
          {tabBtn(
            "pdf",
            "PDF preview",
            <FileText className="h-4 w-4" />,
            !pdfIframeSrc
          )}
          {tabBtn("source", "Plain text", <ScrollText className="h-4 w-4" />, !content)}
          {tabBtn(
            "diff",
            "Diff",
            <GitCompareArrows className="h-4 w-4" />,
            !content || !originalText?.trim()
          )}
        </div>

        {tab === "formatted" && content ? (
          <div className="max-h-[min(72vh,880px)] overflow-y-auto rounded-md bg-zinc-950 p-4">
            <ResumeFormattedView text={content} />
          </div>
        ) : null}

        {tab === "pdf" && pdfIframeSrc ? (
          <div className="rounded-lg border border-zinc-700 overflow-hidden bg-zinc-950">
            <iframe
              title="Tailored resume PDF"
              src={pdfIframeSrc}
              className="w-full h-[min(72vh,720px)] bg-zinc-900"
            />
            <p className="text-xs text-zinc-500 px-3 py-2 border-t border-zinc-800">
              This is the same layout as the downloaded PDF (ATS-friendly sections and bullets).
            </p>
          </div>
        ) : null}

        {tab === "source" && content ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 max-h-[min(72vh,720px)] overflow-y-auto">
            <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed">
              {content}
            </pre>
          </div>
        ) : null}

        {tab === "diff" && content && originalText?.trim() ? (
          <ResumeDiffView original={originalText} tailored={content} />
        ) : null}

        {!content && !pdfIframeSrc ? (
          <p className="text-zinc-500 text-sm">
            No content returned. Set <code className="text-zinc-400">ANTHROPIC_API_KEY</code> on the API
            and try generating again.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
