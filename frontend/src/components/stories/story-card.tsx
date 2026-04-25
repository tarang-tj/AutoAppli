"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Pencil, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mapStoryToQuestions,
  type MappedQuestion,
} from "@/lib/stories/question-mapper";
import type { Story, StoryTag } from "@/lib/stories/storage";

/**
 * StoryCard — single row in the Story Library.
 *
 * Top row: title, edit, delete. Tag chips below. A "Map to questions"
 * toggle expands a panel listing up to 5 common interview questions
 * the story could answer (computed lazily via useMemo).
 *
 * STAR fields aren't shown by default — they live behind a "Show story"
 * toggle to keep the list scannable. Editing brings them up in the
 * StoryForm dialog.
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

interface StoryCardProps {
  story: Story;
  onEdit: (story: Story) => void;
  onDelete: (story: Story) => void;
}

export function StoryCard({ story, onEdit, onDelete }: StoryCardProps) {
  const [showStory, setShowStory] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const questions = useMemo<MappedQuestion[]>(
    () => (showQuestions ? mapStoryToQuestions(story, 5) : []),
    [story, showQuestions],
  );

  return (
    <article
      aria-labelledby={`story-${story.id}-title`}
      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3
            id={`story-${story.id}-title`}
            className="text-sm md:text-base font-semibold text-zinc-50 leading-snug"
          >
            {story.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {story.tags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Edit story: ${story.title}`}
            onClick={() => onEdit(story)}
            className={cn(
              "rounded-md p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800",
              FOCUS_RING,
            )}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Delete story: ${story.title}`}
            onClick={() => onDelete(story)}
            className={cn(
              "rounded-md p-1.5 text-zinc-500 hover:text-red-300 hover:bg-red-500/10",
              FOCUS_RING,
            )}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowQuestions((v) => !v)}
          aria-expanded={showQuestions}
          aria-controls={`story-${story.id}-questions`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-600/10 px-2.5 py-1 text-xs font-medium text-blue-300 hover:bg-blue-600/20",
            FOCUS_RING,
          )}
        >
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          {showQuestions ? "Hide questions" : "Map to questions"}
        </button>
        <button
          type="button"
          onClick={() => setShowStory((v) => !v)}
          aria-expanded={showStory}
          aria-controls={`story-${story.id}-body`}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800",
            FOCUS_RING,
          )}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              showStory && "rotate-180",
            )}
          />
          {showStory ? "Hide story" : "Show story"}
        </button>
      </div>

      {showStory && (
        <div
          id={`story-${story.id}-body`}
          className="mt-3 grid gap-2.5 text-sm text-zinc-200"
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
          className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3"
        >
          {questions.length === 0 ? (
            <p className="text-xs text-zinc-400">
              Add at least one tag to see matching questions.
            </p>
          ) : (
            <ol className="space-y-2 text-sm text-zinc-100">
              {questions.map((q) => (
                <li key={q.question} className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-blue-400 mt-0.5">
                    →
                  </span>
                  <div className="flex-1">
                    <p className="leading-snug">{q.question}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      Hits:{" "}
                      <span className="text-blue-300">
                        {q.matchedTags.join(", ")}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}

function TagChip({ tag }: { tag: StoryTag }) {
  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[11px] font-medium text-zinc-300 capitalize">
      {tag}
    </span>
  );
}

function StarRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3">
      <span className="text-[11px] uppercase tracking-widest text-zinc-500 pt-0.5">
        {label}
      </span>
      <p className="leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}
