"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
  NotebookInput,
  FieldLabel,
} from "@/app/stories/_components/notebook-field";

/**
 * Story form chrome bits — header (eyebrow + title + lead), the
 * single-line title input row, and the footer button row. Pulled out
 * of story-form.tsx so the form file stays close to the 200-line goal
 * and these chunks can be tweaked independently. Pure presentation.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)] focus-visible:ring-[oklch(0.34_0.07_28)]";

interface FormHeaderProps {
  isEdit: boolean;
  titleId: string;
}

export function FormHeader({ isEdit, titleId }: FormHeaderProps) {
  return (
    <>
      <p className="font-[family-name:var(--font-stories-mono)] smallcaps text-[10px] tracking-[0.32em] text-[oklch(0.45_0.05_38)]">
        {isEdit ? "Revising entry" : "A fresh page"}
      </p>
      <h2
        id={titleId}
        className="mt-2 font-[family-name:var(--font-stories-display)] text-[1.9rem] md:text-[2.3rem] font-medium leading-[1.1] tracking-[-0.012em] text-[oklch(0.16_0.02_30)]"
      >
        {isEdit ? (
          <><span className="italic font-normal">Edit</span> the entry</>
        ) : (
          <><span className="italic font-normal">File</span> a story</>
        )}
      </h2>
      <p className="mt-3 max-w-md font-[family-name:var(--font-stories-display)] italic text-[15px] leading-[1.6] text-[oklch(0.32_0.025_35)]">
        One example. Four short paragraphs. You&rsquo;ll reuse it in every
        interview round.
      </p>
    </>
  );
}

interface TitleFieldProps {
  value: string;
  onChange: (next: string) => void;
  error: string | null;
  trimmedLength: number;
  maxLength: number;
}

export const TitleField = forwardRef<HTMLInputElement, TitleFieldProps>(
  function TitleField(
    { value, onChange, error, trimmedLength, maxLength },
    ref,
  ) {
    return (
      <div>
        <FieldLabel
          htmlFor="story-title"
          hint={`${trimmedLength}/${maxLength}`}
        >
          Title
        </FieldLabel>
        <NotebookInput
          ref={ref}
          id="story-title"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Refactored a flaky CI pipeline that blocked merges"
          maxLength={maxLength + 20}
          invalid={error !== null}
          aria-describedby="story-title-help"
        />
        <p
          id="story-title-help"
          className={cn(
            "mt-2 font-[family-name:var(--font-stories-display)] italic text-[12.5px] text-[oklch(0.45_0.05_38)]",
            error && "text-[oklch(0.42_0.18_28)] not-italic",
          )}
        >
          {error ?? "One line. The shorter the title, the easier to recall."}
        </p>
      </div>
    );
  },
);

interface FormFooterProps {
  isEdit: boolean;
  onCancel: () => void;
}

export function FormFooter({ isEdit, onCancel }: FormFooterProps) {
  return (
    <div className="mt-10 flex items-center justify-end gap-6 border-t border-[oklch(0.55_0.05_40_/_0.4)] pt-5">
      <button
        type="button"
        onClick={onCancel}
        className={cn(
          "font-[family-name:var(--font-stories-display)] italic underline decoration-dotted underline-offset-[5px] decoration-[oklch(0.55_0.05_40_/_0.6)] text-[14px] text-[oklch(0.30_0.04_30)] hover:text-[oklch(0.32_0.07_28)] hover:decoration-[oklch(0.32_0.07_28)]",
          FOCUS_RING,
        )}
      >
        Discard
      </button>
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-2 rounded-none border border-[oklch(0.18_0.02_30)] bg-[oklch(0.18_0.02_30)] px-5 py-2.5 font-[family-name:var(--font-stories-mono)] text-[11px] tracking-[0.22em] text-[oklch(0.97_0.012_85)] uppercase transition-colors hover:bg-[oklch(0.32_0.07_28)] hover:border-[oklch(0.32_0.07_28)]",
          FOCUS_RING,
        )}
      >
        {isEdit ? "Save changes" : "File entry"}
      </button>
    </div>
  );
}
