"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  mapStoryToQuestions,
  type MappedQuestion,
} from "@/lib/stories/question-mapper";
import type { Story } from "@/lib/stories/storage";
import {
  EditorialLink,
  StarRow,
  TagInk,
} from "@/app/stories/_components/story-card-bits";

/**
 * StoryCard — a single filed entry.
 *
 * Editorial archive treatment: an oldstyle index number in the gutter,
 * a serif title, an ink-stroke tag row, and inline editorial controls
 * for show story / map questions / edit / delete. STAR fields stay
 * collapsed by default to keep the index scannable; expanded view
 * renders each STAR row with a small-caps label and lead-paragraph
 * body type.
 */

const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

function formatFiled(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")} · ${d.getFullYear()}`;
}

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)] focus-visible:ring-[oklch(0.34_0.07_28)]";

interface StoryCardProps {
  story: Story;
  index: number;
  onEdit: (story: Story) => void;
  onDelete: (story: Story) => void;
}

export function StoryCard({ story, index, onEdit, onDelete }: StoryCardProps) {
  const [showStory, setShowStory] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const questions = useMemo<MappedQuestion[]>(
    () => (showQuestions ? mapStoryToQuestions(story, 5) : []),
    [story, showQuestions],
  );

  const indexPad = String(index).padStart(2, "0");

  return (
    <article
      aria-labelledby={`story-${story.id}-title`}
      className="group/entry relative grid gap-5 md:grid-cols-[5rem_1fr] md:gap-8"
    >
      {/* Gutter: oldstyle figure index + filed-on date */}
      <aside
        aria-hidden="true"
        className="flex flex-row items-baseline gap-3 md:flex-col md:items-end md:gap-2"
      >
        <span
          className="font-[family-name:var(--font-stories-display)] text-[2.6rem] md:text-[3.2rem] leading-none font-light text-[oklch(0.55_0.05_40_/_0.85)]"
          style={{ fontFeatureSettings: '"onum" 1, "lnum" 0' }}
        >
          №{indexPad}
        </span>
        <span className="font-[family-name:var(--font-stories-mono)] text-[10px] tracking-[0.22em] text-[oklch(0.45_0.05_38)] uppercase whitespace-nowrap">
          Filed · {formatFiled(story.createdAt)}
        </span>
      </aside>

      {/* Body */}
      <div className="min-w-0">
        <h3
          id={`story-${story.id}-title`}
          className="font-[family-name:var(--font-stories-display)] text-[1.5rem] md:text-[1.9rem] font-medium leading-[1.15] tracking-[-0.012em] text-[oklch(0.16_0.02_30)]"
        >
          {story.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {story.tags.map((tag) => (
            <TagInk key={tag} tag={tag} />
          ))}
        </div>

        {/* Inline editorial controls — links, not buttons-shaped buttons. */}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-[family-name:var(--font-stories-ui)] text-[13px] text-[oklch(0.30_0.04_30)]">
          <EditorialLink
            active={showQuestions}
            onClick={() => setShowQuestions((v) => !v)}
            controls={`story-${story.id}-questions`}
          >
            {showQuestions ? "Hide questions" : "Map to questions"}
          </EditorialLink>
          <EditorialLink
            active={showStory}
            onClick={() => setShowStory((v) => !v)}
            controls={`story-${story.id}-body`}
          >
            {showStory ? "Hide entry" : "Read entry"}
          </EditorialLink>
          <span aria-hidden="true" className="text-[oklch(0.55_0.05_40_/_0.6)]">·</span>
          <button
            type="button"
            onClick={() => onEdit(story)}
            aria-label={`Edit story: ${story.title}`}
            className={cn(
              "italic underline decoration-dotted underline-offset-[5px] decoration-[oklch(0.55_0.05_40_/_0.6)] hover:text-[oklch(0.32_0.07_28)] hover:decoration-[oklch(0.32_0.07_28)]",
              FOCUS_RING,
            )}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(story)}
            aria-label={`Delete story: ${story.title}`}
            className={cn(
              "italic underline decoration-dotted underline-offset-[5px] decoration-[oklch(0.55_0.05_40_/_0.6)] hover:text-[oklch(0.42_0.18_28)] hover:decoration-[oklch(0.42_0.18_28)]",
              FOCUS_RING,
            )}
          >
            Strike out
          </button>
        </div>

        {showStory && (
          <div
            id={`story-${story.id}-body`}
            className="mt-6 grid gap-4 border-l border-[oklch(0.55_0.05_40_/_0.35)] pl-5"
          >
            <StarRow label="Situation" body={story.situation} />
            <StarRow label="Task" body={story.task} />
            <StarRow label="Action" body={story.action} />
            <StarRow label="Result" body={story.result} />
          </div>
        )}

        {showQuestions && (
          <div
            id={`story-${story.id}-questions`}
            className="mt-6 border-t border-dashed border-[oklch(0.55_0.05_40_/_0.45)] pt-5"
          >
            <p className="font-[family-name:var(--font-stories-mono)] smallcaps text-[10px] tracking-[0.28em] text-[oklch(0.45_0.05_38)]">
              — Catalog cross-reference —
            </p>
            {questions.length === 0 ? (
              <p className="mt-3 font-[family-name:var(--font-stories-display)] italic text-[oklch(0.40_0.04_38)]">
                Add at least one tag to surface matching questions.
              </p>
            ) : (
              <ol className="mt-3 space-y-3 font-[family-name:var(--font-stories-display)] text-[1rem] leading-[1.55] text-[oklch(0.20_0.02_30)]">
                {questions.map((q) => (
                  <li key={q.question} className="flex items-baseline gap-3">
                    <span aria-hidden="true" className="font-[family-name:var(--font-stories-mono)] text-[10px] tracking-widest text-[oklch(0.45_0.05_38)] pt-1">
                      ❧
                    </span>
                    <div className="flex-1">
                      <p className="italic">&ldquo;{q.question}&rdquo;</p>
                      <p className="mt-1 font-[family-name:var(--font-stories-mono)] text-[10px] tracking-[0.18em] text-[oklch(0.45_0.05_38)] uppercase">
                        Answers: {q.matchedTags.join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

