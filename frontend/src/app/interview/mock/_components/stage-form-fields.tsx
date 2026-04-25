/**
 * Form field primitives for the call-sheet (setup) stage.
 *
 * Hand-built (not shadcn) so they can carry the theatrical aesthetic:
 * inset velvet shadow, ember focus ring, mono uppercase labels.
 * Kept in their own file to keep the parent stage under 200 lines.
 */

"use client";

import { ChevronRight } from "lucide-react";

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  focused,
  onFocus,
  onBlur,
}: SelectFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block font-[family-name:var(--font-mock-mono)] text-[0.7rem] uppercase tracking-[0.24em] text-[color:var(--stage-bone-dim)]"
      >
        {label}
      </label>
      <div
        className="relative rounded-sm border bg-[color:color-mix(in_oklch,var(--stage-ink-deep)_70%,transparent)] transition-colors"
        style={{
          borderColor: focused
            ? "color-mix(in oklch, var(--stage-ember) 70%, transparent)"
            : "var(--stage-rule)",
          boxShadow: focused
            ? "0 0 0 3px color-mix(in oklch, var(--stage-ember) 16%, transparent)"
            : "inset 0 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="w-full appearance-none bg-transparent px-4 py-3 pr-10 font-[family-name:var(--font-mock-mono)] text-[color:var(--stage-bone)] focus:outline-none"
          style={{ fontSize: "16px" }}
        >
          {options.map((o) => (
            <option
              key={o.value}
              value={o.value}
              className="bg-[color:var(--stage-ink-deep)] text-[color:var(--stage-bone)]"
            >
              {o.label}
            </option>
          ))}
        </select>
        <ChevronRight
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-[color:var(--stage-bone-dim)]"
        />
      </div>
    </div>
  );
}

interface TextareaFieldProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

export function TextareaField({
  id,
  value,
  onChange,
  rows = 7,
  placeholder,
  focused,
  onFocus,
  onBlur,
}: TextareaFieldProps) {
  return (
    <div
      className="relative rounded-sm border bg-[color:color-mix(in_oklch,var(--stage-ink-deep)_70%,transparent)] transition-colors"
      style={{
        borderColor: focused
          ? "color-mix(in oklch, var(--stage-ember) 70%, transparent)"
          : "var(--stage-rule)",
        boxShadow: focused
          ? "0 0 0 3px color-mix(in oklch, var(--stage-ember) 16%, transparent)"
          : "inset 0 2px 6px rgba(0,0,0,0.3)",
      }}
    >
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-4 py-3.5 font-[family-name:var(--font-mock-mono)] text-[0.95rem] leading-relaxed text-[color:var(--stage-bone)] placeholder:text-[color:color-mix(in_oklch,var(--stage-bone-dim)_50%,transparent)] focus:outline-none"
        style={{ fontSize: "16px" }}
        spellCheck={false}
      />
    </div>
  );
}
