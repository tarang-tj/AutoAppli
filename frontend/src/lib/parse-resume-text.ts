/**
 * Parse tailored resume plain text into blocks for on-screen layout.
 * Heuristics align with backend ReportLab PDF generation (section headings, bullets).
 */

export type ResumeBlock =
  | { type: "name"; text: string }
  | { type: "contact"; text: string }
  | { type: "divider" }
  | { type: "section"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string };

const SECTION_PHRASES = new Set(
  [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "education",
    "skills",
    "technical skills",
    "core competencies",
    "projects",
    "summary",
    "professional summary",
    "profile",
    "objective",
    "certifications",
    "awards",
    "honors",
    "publications",
    "volunteer",
    "volunteer experience",
    "references",
    "interests",
    "languages",
    "leadership",
  ].map((s) => s.toLowerCase())
);

const ALL_CAPS_HEADING = /^[A-Z][A-Z &/'’\-]+$/;

function isSectionHeading(line: string): boolean {
  const s = line.trim();
  if (!s || s.length > 72) return false;
  if (ALL_CAPS_HEADING.test(s)) return true;
  return SECTION_PHRASES.has(s.toLowerCase());
}

function looksLikeContact(line: string): boolean {
  const l = line.toLowerCase();
  return (
    l.includes("@") ||
    l.includes("|") ||
    l.includes("linkedin") ||
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)
  );
}

/** Strip lightweight markdown artifacts for display/PDF-friendly text. */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

export function parseResumePlainText(raw: string): ResumeBlock[] {
  const lines = (raw || "").split(/\r?\n/);
  const blocks: ResumeBlock[] = [];
  let i = 0;

  if (i < lines.length) {
    const first = lines[i].trim();
    if (first) {
      blocks.push({ type: "name", text: stripInlineMarkdown(first) });
      i += 1;
    }
  }

  if (i < lines.length) {
    const second = lines[i].trim();
    if (second && looksLikeContact(second)) {
      blocks.push({ type: "contact", text: stripInlineMarkdown(second) });
      i += 1;
    }
  }

  blocks.push({ type: "divider" });

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    i += 1;

    if (!trimmed) continue;

    if (/^---+$/u.test(trimmed)) {
      continue;
    }

    if (isSectionHeading(trimmed)) {
      if (i < lines.length && /^---+$/u.test(lines[i].trim())) {
        i += 1;
      }
      const display =
        trimmed === trimmed.toUpperCase() && trimmed.length > 2
          ? trimmed.replace(/\w\S*/g, (w) => w.charAt(0) + w.slice(1).toLowerCase())
          : trimmed;
      blocks.push({ type: "section", text: stripInlineMarkdown(display) });
      continue;
    }

    if (/^[-*•]\s/.test(trimmed)) {
      blocks.push({
        type: "bullet",
        text: stripInlineMarkdown(trimmed.replace(/^[-*•]\s+/, "")),
      });
      continue;
    }

    blocks.push({ type: "paragraph", text: stripInlineMarkdown(trimmed) });
  }

  return blocks;
}
