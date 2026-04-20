import { parseResumePlainText, stripInlineMarkdown } from "@/lib/parse-resume-text";
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type ResumeTemplateId,
} from "@/lib/resume-templates";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Standalone HTML document for download or print-from-new-window.
 *
 * Sprint 7 — accepts a `templateId` so the exported file's CSS matches
 * whatever the user was previewing on screen. The template registry in
 * `resume-templates.ts` is the single source of truth for styling.
 */
export function buildResumeHtmlDocument(
  plainText: string,
  title = "Tailored resume",
  templateId: ResumeTemplateId = DEFAULT_TEMPLATE_ID,
): string {
  const template = getTemplate(templateId);
  const blocks = parseResumePlainText(plainText);
  const chunks: string[] = [];
  let bulletBuf: string[] = [];

  const flushBullets = () => {
    if (bulletBuf.length === 0) return;
    chunks.push(
      `<ul class="bullets">\n${bulletBuf.map((t) => `  <li class="bullet">${esc(t)}</li>`).join("\n")}\n</ul>`,
    );
    bulletBuf = [];
  };

  for (const b of blocks) {
    switch (b.type) {
      case "name":
        flushBullets();
        chunks.push(`<h1 class="name">${esc(b.text)}</h1>`);
        break;
      case "contact":
        flushBullets();
        chunks.push(`<p class="contact">${esc(b.text)}</p>`);
        break;
      case "divider":
        flushBullets();
        chunks.push('<hr class="rule" />');
        break;
      case "section":
        flushBullets();
        chunks.push(`<h2 class="section">${esc(b.text)}</h2>`);
        break;
      case "bullet":
        bulletBuf.push(b.text);
        break;
      case "paragraph":
        flushBullets();
        chunks.push(`<p class="body">${esc(b.text)}</p>`);
        break;
      default:
        break;
    }
  }
  flushBullets();

  const bodyInner = chunks.join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    ${template.exportCss.trim()}
  </style>
</head>
<body>
${bodyInner}
</body>
</html>`;
}

export function downloadResumeHtml(
  plainText: string,
  filename = "tailored-resume.html",
  templateId: ResumeTemplateId = DEFAULT_TEMPLATE_ID,
): void {
  const html = buildResumeHtmlDocument(
    stripInlineMarkdown(plainText),
    "Tailored resume",
    templateId,
  );
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openResumePrintWindow(
  plainText: string,
  templateId: ResumeTemplateId = DEFAULT_TEMPLATE_ID,
): void {
  const html = buildResumeHtmlDocument(plainText, "Tailored resume", templateId);
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 200);
  };
}
