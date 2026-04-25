"use client";

import { cn } from "@/lib/utils";
import {
  NotebookTextarea,
  FieldLabel,
} from "@/app/stories/_components/notebook-field";

/**
 * NotebookFieldRow — label + underlined textarea + hint/error caption.
 *
 * Used for each STAR row in the story form. The hint copy may include
 * HTML entities (e.g. &lsquo; / &rsquo;) so it is rendered via
 * dangerouslySetInnerHTML — caller is responsible for the literal text.
 */

interface NotebookFieldRowProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  error: string | null;
}

export function NotebookFieldRow({
  id,
  label,
  hint,
  value,
  onChange,
  error,
}: NotebookFieldRowProps) {
  const helpId = `${id}-help`;
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NotebookTextarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        invalid={error !== null}
        aria-describedby={helpId}
      />
      <p
        id={helpId}
        className={cn(
          "mt-2 font-[family-name:var(--font-stories-display)] italic text-[12.5px] text-[oklch(0.45_0.05_38)]",
          error && "text-[oklch(0.42_0.18_28)] not-italic",
        )}
        dangerouslySetInnerHTML={{ __html: error ?? hint }}
      />
    </div>
  );
}
