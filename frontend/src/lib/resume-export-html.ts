import { parseResumePlainText, stripInlineMarkdown } from "@/lib/parse-resume-text";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Standalone HTML document for download or print-from-new-window. */
export function buildResumeHtmlDocument(plainText: string, title = "Tailored resume"): string {
  const blocks = parseResumePlainText(plainText);
  const chunks: string[] = [];
  let bulletBuf: string[] = [];

  const flushBullets = () => {
    if (bulletBuf.length === 0) return;
    chunks.push(
      `<ul class="bullets">\n${bulletBuf.map((t) => `  <li class="bullet">${esc(t)}</li>`).join("\n")}\n</ul>`
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
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 8.5in; margin: 0 auto; padding: 0.6in 0.75in; color: #1a1a1a; line-height: 1.35; }
    .name { font-size: 18pt; text-align: center; margin: 0 0 0.15em; font-weight: 700; }
    .contact { font-size: 10pt; text-align: center; color: #444; margin: 0 0 1em; }
    .rule { border: none; border-top: 1px solid #ccc; margin: 0 0 0.75em; }
    .section { font-size: 11pt; font-weight: 700; color: #2c3e50; margin: 1em 0 0.35em; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
    .body { font-size: 10pt; margin: 0 0 0.35em; }
    .bullets { margin: 0.25em 0 0.5em 1.1em; padding: 0; }
    .bullet { font-size: 10pt; margin-bottom: 0.2em; }
    @media print { body { padding: 0.5in; } }
  </style>
</head>
<body>
${bodyInner}
</body>
</html>`;
}

export function downloadResumeHtml(plainText: string, filename = "tailored-resume.html"): void {
  const html = buildResumeHtmlDocument(stripInlineMarkdown(plainText));
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openResumePrintWindow(plainText: string): void {
  const html = buildResumeHtmlDocument(plainText);
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
