"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  STORY_TAGS,
  writeStory,
  type Story,
  type StoryInput,
  type StoryTag,
} from "@/lib/stories/storage";

/**
 * StoryForm — add/edit dialog for a STAR-format story.
 *
 * Renders a hand-rolled dialog (matches OnboardingTour pattern) so we
 * can hold focus, restore on close, and dismiss on Esc/backdrop. The
 * tag picker is a row of toggle buttons with `aria-pressed` — no native
 * multiselect, which screen-readers handle poorly on mobile.
 *
 * State pattern: the inner `StoryFormBody` is keyed by `initial?.id ??
 * "new"`. React unmounts/remounts on a different story, which seeds
 * fresh state via lazy initializers — no setState-in-effect needed.
 *
 * Validation:
 *   - title required, &le; 80 chars
 *   - 1–3 tags
 *   - all four STAR fields non-empty
 */

const MAX_TITLE_LEN = 80;
const MIN_TAGS = 1;
const MAX_TAGS = 3;

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

interface StoryFormProps {
  open: boolean;
  initial: Story | null;
  onClose: () => void;
  onSaved: (story: Story) => void;
}

export function StoryForm({ open, initial, onClose, onSaved }: StoryFormProps) {
  if (!open) return null;
  return (
    <StoryFormBody
      key={initial?.id ?? "new"}
      initial={initial}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

interface StoryFormBodyProps {
  initial: Story | null;
  onClose: () => void;
  onSaved: (story: Story) => void;
}

function StoryFormBody({ initial, onClose, onSaved }: StoryFormBodyProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Lazy initializers — seed once from `initial`. Resets between stories
  // happen via the `key` on the wrapper, not via effects.
  const [title, setTitle] = useState(() => initial?.title ?? "");
  const [tags, setTags] = useState<StoryTag[]>(() => initial?.tags ?? []);
  const [situation, setSituation] = useState(() => initial?.situation ?? "");
  const [task, setTask] = useState(() => initial?.task ?? "");
  const [action, setAction] = useState(() => initial?.action ?? "");
  const [result, setResult] = useState(() => initial?.result ?? "");
  const [submitted, setSubmitted] = useState(false);

  useFocusTrap(true, dialogRef);

  // Capture opener on mount (so close restores focus) and pull focus
  // into the title field. Both are mount-only — no setState here.
  useEffect(() => {
    if (typeof document !== "undefined") {
      openerRef.current = document.activeElement as HTMLElement | null;
    }
    const t = setTimeout(() => titleInputRef.current?.focus(), 10);
    return () => {
      clearTimeout(t);
      const opener = openerRef.current;
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, []);

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleTag = useCallback((tag: StoryTag) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  }, []);

  const trimmedTitle = title.trim();
  const errors = {
    title:
      !trimmedTitle
        ? "Give it a one-line title."
        : trimmedTitle.length > MAX_TITLE_LEN
          ? `Keep it under ${MAX_TITLE_LEN} characters.`
          : null,
    tags:
      tags.length < MIN_TAGS
        ? "Pick at least one tag."
        : tags.length > MAX_TAGS
          ? `Pick up to ${MAX_TAGS} tags.`
          : null,
    situation: situation.trim() ? null : "Describe the situation.",
    task: task.trim() ? null : "What was the task?",
    action: action.trim() ? null : "What did you do?",
    result: result.trim() ? null : "What happened?",
  };
  const canSubmit = Object.values(errors).every((e) => e === null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitted(true);
      if (!canSubmit) return;
      const payload: StoryInput = {
        id: initial?.id,
        title: trimmedTitle,
        tags,
        situation: situation.trim(),
        task: task.trim(),
        action: action.trim(),
        result: result.trim(),
      };
      const saved = writeStory(payload);
      onSaved(saved);
      onClose();
    },
    [
      canSubmit,
      initial?.id,
      tags,
      situation,
      task,
      action,
      result,
      trimmedTitle,
      onSaved,
      onClose,
    ],
  );

  const showError = (msg: string | null) => submitted && msg !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] bg-zinc-950/80 backdrop-blur-sm overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close story form"
          onClick={onClose}
          className={cn(
            "absolute top-3 right-3 rounded-md p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800",
            FOCUS_RING,
          )}
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>

        <form onSubmit={handleSubmit} className="p-6 md:p-7" noValidate>
          <h2
            id={titleId}
            className="text-lg md:text-xl font-bold text-white tracking-tight"
          >
            {initial ? "Edit story" : "Add a story"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400 leading-relaxed">
            One example, four short paragraphs. You&rsquo;ll reuse this in every
            interview round.
          </p>

          <div className="mt-5 space-y-4">
            {/* Title */}
            <div>
              <label
                htmlFor="story-title"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Title
              </label>
              <Input
                ref={titleInputRef}
                id="story-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Refactored a flaky CI pipeline that blocked merges"
                maxLength={MAX_TITLE_LEN + 20}
                aria-invalid={showError(errors.title) || undefined}
                aria-describedby="story-title-help"
              />
              <div
                id="story-title-help"
                className="mt-1 flex items-center justify-between text-[11px]"
              >
                <span
                  className={cn(
                    "text-zinc-500",
                    showError(errors.title) && "text-red-400",
                  )}
                >
                  {showError(errors.title)
                    ? errors.title
                    : "One line. The shorter the title, the easier to recall."}
                </span>
                <span className="tabular-nums text-zinc-500">
                  {trimmedTitle.length}/{MAX_TITLE_LEN}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <span className="block text-xs font-medium text-zinc-300 mb-1.5">
                Tags <span className="text-zinc-500">(1–3)</span>
              </span>
              <div role="group" aria-label="Story tags" className="flex flex-wrap gap-1.5">
                {STORY_TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors capitalize",
                        FOCUS_RING,
                        active
                          ? "border-blue-500/60 bg-blue-600/15 text-blue-300"
                          : "border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600",
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {showError(errors.tags) && (
                <p className="mt-1 text-[11px] text-red-400">{errors.tags}</p>
              )}
            </div>

            {/* STAR fields */}
            <StarField
              id="story-situation"
              label="Situation"
              hint="Set the scene. One or two sentences."
              value={situation}
              onChange={setSituation}
              error={showError(errors.situation) ? errors.situation : null}
            />
            <StarField
              id="story-task"
              label="Task"
              hint="What were you on the hook for?"
              value={task}
              onChange={setTask}
              error={showError(errors.task) ? errors.task : null}
            />
            <StarField
              id="story-action"
              label="Action"
              hint="What did you actually do? Use &lsquo;I,&rsquo; not &lsquo;we.&rsquo;"
              value={action}
              onChange={setAction}
              error={showError(errors.action) ? errors.action : null}
            />
            <StarField
              id="story-result"
              label="Result"
              hint="Numbers if you have them. What changed?"
              value={result}
              onChange={setResult}
              error={showError(errors.result) ? errors.result : null}
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="default">
              {initial ? "Save changes" : "Save story"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface StarFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
  error: string | null;
}

function StarField({ id, label, hint, value, onChange, error }: StarFieldProps) {
  const helpId = `${id}-help`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-zinc-300 mb-1.5"
      >
        {label}
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        aria-invalid={error !== null || undefined}
        aria-describedby={helpId}
      />
      <p
        id={helpId}
        className={cn(
          "mt-1 text-[11px] text-zinc-500",
          error && "text-red-400",
        )}
      >
        {error ?? hint}
      </p>
    </div>
  );
}
