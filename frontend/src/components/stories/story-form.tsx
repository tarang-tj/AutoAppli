"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { NotebookDialogShell } from "@/app/stories/_components/dialog-shell";
import { NotebookFieldRow } from "@/app/stories/_components/notebook-field-row";
import { TagPicker } from "@/app/stories/_components/tag-picker";
import {
  FormFooter,
  FormHeader,
  TitleField,
} from "@/app/stories/_components/story-form-internals";
import {
  MAX_TITLE_LEN,
  useStoryFormState,
} from "@/app/stories/_components/use-story-form-state";
import type { Story } from "@/lib/stories/storage";

/**
 * StoryForm — "open a fresh page" dialog for a STAR-format entry.
 *
 * Cream-paper modal on top of the editorial canvas. Hand-rolled (vs
 * shadcn's Dialog) so we keep:
 *   - focus trap inside the panel
 *   - opener focus restore on close
 *   - Esc to close
 *   - backdrop click to close
 *
 * Draft state, validation, tag toggling, and the save call live in
 * `useStoryFormState`. The form body is keyed by `initial?.id ?? "new"`
 * on the wrapper so React unmounts/remounts on a different story —
 * fresh state via lazy initializers, no setState-in-effect.
 */

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

  const s = useStoryFormState(initial);

  useFocusTrap(true, dialogRef);

  // Capture opener (so close restores focus) and pull focus into title.
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

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const saved = s.submit();
      if (!saved) return;
      onSaved(saved);
      onClose();
    },
    [s, onSaved, onClose],
  );

  const showError = (msg: string | null) => s.submitted && msg !== null;

  // STAR rows config-driven so the JSX stays compact and the order is
  // canonical S-T-A-R for screen-reader users navigating linearly.
  const starRows = [
    { id: "story-situation", label: "Situation", hint: "Set the scene. One or two sentences.", value: s.situation, setValue: s.setSituation, error: showError(s.errors.situation) ? s.errors.situation : null },
    { id: "story-task", label: "Task", hint: "What were you on the hook for?", value: s.task, setValue: s.setTask, error: showError(s.errors.task) ? s.errors.task : null },
    { id: "story-action", label: "Action", hint: "What did you actually do? Use &lsquo;I,&rsquo; not &lsquo;we.&rsquo;", value: s.action, setValue: s.setAction, error: showError(s.errors.action) ? s.errors.action : null },
    { id: "story-result", label: "Result", hint: "Numbers if you have them. What changed?", value: s.result, setValue: s.setResult, error: showError(s.errors.result) ? s.errors.result : null },
  ];

  return (
    <NotebookDialogShell
      ref={dialogRef}
      ariaLabelledBy={titleId}
      onBackdropClose={onClose}
      onCloseClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="px-7 pb-7 pt-9 md:px-12 md:pb-10 md:pt-12"
        noValidate
      >
        <FormHeader isEdit={Boolean(initial)} titleId={titleId} />

        <div className="mt-8 space-y-7">
          <TitleField
            ref={titleInputRef}
            value={s.title}
            onChange={s.setTitle}
            error={showError(s.errors.title) ? s.errors.title : null}
            trimmedLength={s.trimmedTitle.length}
            maxLength={MAX_TITLE_LEN}
          />

          <TagPicker
            tags={s.tags}
            onToggle={s.toggleTag}
            error={showError(s.errors.tags) ? s.errors.tags : null}
          />

          {starRows.map((row) => (
            <NotebookFieldRow
              key={row.id}
              id={row.id}
              label={row.label}
              hint={row.hint}
              value={row.value}
              onChange={row.setValue}
              error={row.error}
            />
          ))}
        </div>

        <FormFooter isEdit={Boolean(initial)} onCancel={onClose} />
      </form>
    </NotebookDialogShell>
  );
}
