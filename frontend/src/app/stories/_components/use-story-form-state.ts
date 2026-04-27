"use client";

import { useCallback, useState } from "react";
import {
  writeStory,
  type Story,
  type StoryInput,
  type StoryTag,
} from "@/lib/stories/storage";

/**
 * useStoryFormState — owns all draft state, validation, tag toggling,
 * and the save handler for the StoryForm. Pulled out so the form
 * component stays focused on layout / focus management.
 *
 * `initial` seeds via lazy initializers — callers should still rely on
 * the `key={initial?.id ?? "new"}` pattern on the form body to remount
 * between stories rather than syncing with effects.
 *
 * `initialValues` is an optional override for new stories only (e.g. prefill
 * from a ?import= URL param). It takes precedence over blank defaults but
 * yields to `initial` (edit mode).
 */

export const MAX_TITLE_LEN = 80;
const MIN_TAGS = 1;
const MAX_TAGS = 3;

export interface StoryFormErrors {
  title: string | null;
  tags: string | null;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
}

export interface StoryPrefill {
  title?: string;
  situation?: string;
  task?: string;
  action?: string;
  result?: string;
  tags?: StoryTag[];
}

export function useStoryFormState(initial: Story | null, initialValues?: StoryPrefill) {
  const [title, setTitle] = useState(() => initial?.title ?? initialValues?.title ?? "");
  const [tags, setTags] = useState<StoryTag[]>(() => initial?.tags ?? initialValues?.tags ?? []);
  const [situation, setSituation] = useState(() => initial?.situation ?? initialValues?.situation ?? "");
  const [task, setTask] = useState(() => initial?.task ?? initialValues?.task ?? "");
  const [action, setAction] = useState(() => initial?.action ?? initialValues?.action ?? "");
  const [result, setResult] = useState(() => initial?.result ?? initialValues?.result ?? "");
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = useCallback((tag: StoryTag) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  }, []);

  const trimmedTitle = title.trim();
  const errors: StoryFormErrors = {
    title: !trimmedTitle
      ? "Give it a one-line title."
      : trimmedTitle.length > MAX_TITLE_LEN
        ? `Keep it under ${MAX_TITLE_LEN} characters.`
        : null,
    tags: tags.length < MIN_TAGS
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

  const submit = useCallback((): Story | null => {
    setSubmitted(true);
    if (!canSubmit) return null;
    const payload: StoryInput = {
      id: initial?.id,
      title: trimmedTitle,
      tags,
      situation: situation.trim(),
      task: task.trim(),
      action: action.trim(),
      result: result.trim(),
    };
    return writeStory(payload);
  }, [canSubmit, initial?.id, tags, situation, task, action, result, trimmedTitle]);

  return {
    title,
    setTitle,
    trimmedTitle,
    tags,
    toggleTag,
    situation,
    setSituation,
    task,
    setTask,
    action,
    setAction,
    result,
    setResult,
    submitted,
    errors,
    canSubmit,
    submit,
  };
}
