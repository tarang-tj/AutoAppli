"use client";

import { Button } from "@/components/ui/button";
import { Download, FileText, Code } from "lucide-react";
import { toast } from "sonner";

interface Props {
  content: string;
  fileName?: string;
}

export function ResumeDownload({ content, fileName = "tailored-resume" }: Props) {
  if (!content.trim()) return null;

  const downloadTxt = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as TXT");
  };

  const downloadHtml = () => {
    // Convert plain text resume to styled HTML
    const lines = content.split("\n");
    let html = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        html += "<br/>\n";
        continue;
      }
      // All-caps lines are headers
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && /[A-Z]/.test(trimmed)) {
        html += `<h2 style="margin:16px 0 6px;font-size:14px;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:3px;">${trimmed}</h2>\n`;
      } else if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
        html += `<li style="margin:2px 0 2px 24px;font-size:11px;line-height:1.5;">${trimmed.replace(/^[•\-*]\s*/, "")}</li>\n`;
      } else {
        html += `<p style="margin:2px 0;font-size:11px;line-height:1.5;">${trimmed}</p>\n`;
      }
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${fileName}</title>
<style>
  body { font-family: 'Calibri', 'Helvetica Neue', Arial, sans-serif; max-width: 750px; margin: 40px auto; padding: 0 20px; color: #222; }
  @media print { body { margin: 0; padding: 20px; } }
</style>
</head>
<body>
${html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded as HTML — open in browser and print to PDF");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={downloadTxt} className="border-zinc-700 text-zinc-300 hover:text-white">
        <FileText className="h-3.5 w-3.5 mr-1.5" />
        Download TXT
      </Button>
      <Button variant="outline" size="sm" onClick={downloadHtml} className="border-zinc-700 text-zinc-300 hover:text-white">
        <Code className="h-3.5 w-3.5 mr-1.5" />
        Download HTML
      </Button>
      <Button variant="outline" size="sm" onClick={copyToClipboard} className="border-zinc-700 text-zinc-300 hover:text-white">
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Copy
      </Button>
    </div>
  );
}
