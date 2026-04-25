"use client";

import { cn } from "@/lib/utils";
import { FieldLabel } from "@/app/stories/_components/notebook-field";
import { STORY_TAGS, type StoryTag } from "@/lib/stories/storage";

/**
 * TagPicker — toggle row for the 1–3 story tags.
 *
 * Letterpress-pressed labels: each tag is a small-caps mono word; the
 * selected ones get a soft marker-highlight stroke (.ink-mark). aria-
 * pressed gives screen readers the toggle semantics they need without
 * a native multiselect.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)] focus-visible:ring-[oklch(0.34_0.07_28)]";

interface TagPickerProps {
  tags: StoryTag[];
  onToggle: (tag: StoryTag) => void;
  error: string | null;
}

export function TagPicker({ tags, onToggle, error }: TagPickerProps) {
  return (
    <div>
      <FieldLabel htmlFor="tag-picker" hint="One to three">
        Tags
      </FieldLabel>
      <div
        id="tag-picker"
        role="group"
        aria-label="Story tags"
        className="mt-3 flex flex-wrap gap-x-4 gap-y-2"
      >
        {STORY_TAGS.map((tag) => {
          const active = tags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(tag)}
              className={cn(
                "font-[family-name:var(--font-stories-mono)] text-[10.5px] tracking-[0.18em] uppercase transition-colors",
                FOCUS_RING,
                active
                  ? "text-[oklch(0.16_0.02_30)]"
                  : "text-[oklch(0.45_0.05_38)] hover:text-[oklch(0.20_0.02_30)]",
              )}
            >
              <span className={cn(active && "ink-mark")}>{tag}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 font-[family-name:var(--font-stories-display)] text-[12.5px] text-[oklch(0.42_0.18_28)]">
          {error}
        </p>
      )}
    </div>
  );
}
