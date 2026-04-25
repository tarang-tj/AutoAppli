"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Notebook input/textarea pairs styled to match the editorial canvas.
 *
 * Underline-only inputs (the input *is* the writing line). No box, no
 * fill — borders feel like ATM forms; the notebook feels like writing.
 * Focus state strengthens the underline and shifts to the oxblood ink.
 */

const baseField = cn(
  "w-full bg-transparent border-0 border-b border-[oklch(0.55_0.05_40_/_0.5)]",
  "px-0 py-2 text-[1.02rem] leading-[1.6]",
  "font-[family-name:var(--font-stories-display)] text-[oklch(0.16_0.02_30)]",
  "placeholder:text-[oklch(0.55_0.05_40_/_0.6)] placeholder:italic",
  "focus:outline-none focus:border-[oklch(0.32_0.07_28)]",
  "transition-colors",
  "aria-invalid:border-[oklch(0.50_0.18_28)]",
);

interface NotebookInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const NotebookInput = forwardRef<HTMLInputElement, NotebookInputProps>(
  function NotebookInput({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(baseField, "h-10", className)}
        {...rest}
      />
    );
  },
);

interface NotebookTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function NotebookTextarea({
  className,
  invalid,
  rows = 3,
  ...rest
}: NotebookTextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(baseField, "min-h-[5.5rem] resize-none", className)}
      {...rest}
    />
  );
}

interface FieldLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}

export function FieldLabel({ htmlFor, children, hint }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-baseline justify-between font-[family-name:var(--font-stories-mono)] smallcaps text-[10px] tracking-[0.28em] text-[oklch(0.40_0.05_38)]"
    >
      <span>{children}</span>
      {hint && <span className="normal-case tracking-normal italic font-[family-name:var(--font-stories-display)] text-[12px] text-[oklch(0.45_0.05_38)]">{hint}</span>}
    </label>
  );
}
