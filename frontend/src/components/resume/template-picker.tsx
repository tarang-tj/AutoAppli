"use client";
/**
 * Sprint 7 — compact template picker shown in the ResumePreview header.
 *
 * Two-option segmented control. Keeps the preview tight — no dropdown
 * needed when there are only two templates. When we grow to 4+ we can
 * swap this for a popover + radio grid without touching the consumers.
 */
import { cn } from "@/lib/utils";
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@/lib/resume-templates";

interface TemplatePickerProps {
  value: ResumeTemplateId;
  onChange: (id: ResumeTemplateId) => void;
  /** Visually compact variant used inside dense card headers. */
  compact?: boolean;
}

export function TemplatePicker({
  value,
  onChange,
  compact = false,
}: TemplatePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Resume template"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/80 p-1",
        compact && "gap-0.5 p-0.5",
      )}
    >
      {RESUME_TEMPLATES.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t.id)}
            title={t.description}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              compact && "px-2 py-0.5",
              selected
                ? "bg-zinc-100 text-zinc-900 shadow-sm"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
