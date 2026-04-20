/**
 * Sprint 7 — resume template registry.
 *
 * A "template" is a paired set of:
 *   1. Tailwind classes for the on-screen preview (ResumeFormattedView).
 *   2. Static CSS for the HTML export (buildResumeHtmlDocument).
 *
 * Keeping them in one file means both surfaces stay in sync: what the user
 * sees in the preview card matches the file they download byte-for-byte.
 *
 * Template choice is persisted to localStorage (`autoappli_resume_template`)
 * so the user doesn't have to re-pick every time they come back.
 */

export type ResumeTemplateId = "harvard" | "modern";

export interface ResumeTemplate {
  id: ResumeTemplateId;
  label: string;
  /** One-liner shown under the label in the template picker. */
  description: string;
  /** Tailwind classes applied per block type inside ResumeFormattedView. */
  preview: {
    /** The outer "paper" — background, margins, base font, base size. */
    container: string;
    name: string;
    contact: string;
    divider: string;
    section: string;
    bullet: string;
    paragraph: string;
  };
  /** Static CSS rendered into the exported .html document. */
  exportCss: string;
}

// ── Harvard Classic ────────────────────────────────────────────────
//
// Matches the Harvard OCS / Harvard Law resume guide:
//   - Single page, 1in margins (we use 0.75in here for a touch more
//     room — matches what recruiters typically see from Harvard career
//     services templates in practice).
//   - Georgia serif (a close cousin of Garamond, but web-safe and
//     rendering-identical across browsers/OSes).
//   - Center-aligned name in large bold.
//   - Section headings in small-caps bold with a thin rule below.
//   - Compact line-height; dense but readable.
const HARVARD: ResumeTemplate = {
  id: "harvard",
  label: "Harvard Classic",
  description: "Serif, centered header — consulting/finance/CS expectations.",
  preview: {
    container: [
      "rounded-lg border border-zinc-600 bg-white text-zinc-900 shadow-xl shadow-black/25",
      "mx-auto w-full max-w-[8.5in] min-h-[11in] px-[0.75in] py-[0.55in]",
      "text-[10.5pt] leading-[1.32]",
      // Georgia stack — falls back to Times then generic serif.
      "[font-family:Georgia,'Times_New_Roman',serif]",
    ].join(" "),
    name: "text-center text-[18pt] font-bold leading-tight tracking-tight text-zinc-950",
    contact: "mt-1 text-center text-[10pt] text-zinc-700",
    divider: "my-3 border-0 border-t border-zinc-400",
    section:
      "mt-4 border-b border-zinc-400 pb-0.5 text-[11pt] font-bold uppercase tracking-[0.08em] text-zinc-900 first:mt-0",
    bullet:
      "my-1 ml-4 list-disc space-y-0.5 pl-1 text-[10.5pt] text-zinc-900 marker:text-zinc-600",
    paragraph: "mt-1 text-[10.5pt] text-zinc-900",
  },
  exportCss: `
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.55in 0.75in;
      color: #111;
      line-height: 1.32;
      font-size: 10.5pt;
    }
    .name {
      font-size: 18pt;
      text-align: center;
      margin: 0 0 0.15em;
      font-weight: 700;
      letter-spacing: -0.005em;
    }
    .contact { font-size: 10pt; text-align: center; color: #333; margin: 0 0 1em; }
    .rule { border: none; border-top: 1px solid #9ca3af; margin: 0 0 0.75em; }
    .section {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #111;
      margin: 1em 0 0.35em;
      border-bottom: 1px solid #9ca3af;
      padding-bottom: 2px;
    }
    .body { font-size: 10.5pt; margin: 0 0 0.35em; }
    .bullets { margin: 0.25em 0 0.5em 1.1em; padding: 0; }
    .bullet { font-size: 10.5pt; margin-bottom: 0.2em; }
    @media print { body { padding: 0.5in 0.6in; } }
  `,
};

// ── Modern Clean ───────────────────────────────────────────────────
//
// Jobright / Rezi / Teal style:
//   - Sans-serif (Inter — web-safe fallback stack).
//   - Left-aligned name + contact block, slightly larger name.
//   - Section headings in bold tracking-wide with a subtle color accent.
//   - More whitespace — reads as "cleaner," but you get a little less room.
//   - What YC/Series-A startups expect: modern, skimmable, no wasted ink.
const MODERN: ResumeTemplate = {
  id: "modern",
  label: "Modern Clean",
  description: "Sans-serif, left-aligned — startup/tech expectations.",
  preview: {
    container: [
      "rounded-lg border border-zinc-600 bg-white text-zinc-900 shadow-xl shadow-black/25",
      "mx-auto w-full max-w-[8.5in] min-h-[11in] px-[0.75in] py-[0.6in]",
      "text-[10.5pt] leading-[1.45]",
      // System-stack modern sans.
      "[font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe_UI',Roboto,Arial,sans-serif]",
    ].join(" "),
    name: "text-[20pt] font-bold leading-tight tracking-tight text-zinc-950",
    contact: "mt-1 text-[10pt] text-zinc-600",
    divider: "my-4 border-0 border-t border-zinc-200",
    section:
      "mt-5 pb-1 text-[10.5pt] font-semibold uppercase tracking-[0.12em] text-[#1e40af] first:mt-0 border-b border-zinc-300",
    bullet:
      "my-1.5 ml-4 list-disc space-y-1 pl-1 text-[10.5pt] text-zinc-800 marker:text-[#1e40af]",
    paragraph: "mt-1.5 text-[10.5pt] text-zinc-800",
  },
  exportCss: `
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.6in 0.75in;
      color: #1f2937;
      line-height: 1.45;
      font-size: 10.5pt;
    }
    .name {
      font-size: 20pt;
      text-align: left;
      margin: 0 0 0.1em;
      font-weight: 700;
      color: #0a0a0a;
      letter-spacing: -0.015em;
    }
    .contact { font-size: 10pt; text-align: left; color: #525866; margin: 0 0 1.1em; }
    .rule { border: none; border-top: 1px solid #e5e7eb; margin: 0 0 1em; }
    .section {
      font-size: 10.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #1e40af;
      margin: 1.2em 0 0.4em;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 3px;
    }
    .body { font-size: 10.5pt; margin: 0 0 0.4em; color: #1f2937; }
    .bullets { margin: 0.25em 0 0.6em 1.1em; padding: 0; }
    .bullet { font-size: 10.5pt; margin-bottom: 0.25em; color: #1f2937; }
    @media print { body { padding: 0.5in 0.65in; } }
  `,
};

export const RESUME_TEMPLATES: ResumeTemplate[] = [HARVARD, MODERN];

export const DEFAULT_TEMPLATE_ID: ResumeTemplateId = "harvard";

export function getTemplate(id: ResumeTemplateId | string | null | undefined): ResumeTemplate {
  const found = RESUME_TEMPLATES.find((t) => t.id === id);
  return found ?? HARVARD;
}

// ── localStorage persistence ──────────────────────────────────────

const STORAGE_KEY = "autoappli_resume_template";

/** Read the user's saved template id. Returns default if missing or invalid. */
export function loadTemplatePreference(): ResumeTemplateId {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "harvard" || raw === "modern") return raw;
  } catch {
    /* private browsing / storage disabled */
  }
  return DEFAULT_TEMPLATE_ID;
}

export function saveTemplatePreference(id: ResumeTemplateId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
