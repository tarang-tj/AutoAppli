"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { StoryCard } from "@/components/stories/story-card";
import { StoryForm } from "@/components/stories/story-form";
import { Masthead } from "@/app/stories/_components/masthead";
import { EmptyState } from "@/app/stories/_components/empty-state";
import {
  deleteStory,
  getStoriesServerSnapshot,
  getStoriesSnapshot,
  subscribeStories,
  type Story,
} from "@/lib/stories/storage";

/**
 * /stories — Story Library page (editorial archive treatment).
 *
 * Reads stories via useSyncExternalStore (matches OnboardingTour /
 * ThemeToggle pattern). Writes go through the StoryForm dialog which
 * calls writeStory directly; the subscription handles re-render.
 *
 * Page-level keyboard affordances:
 *   - "n" with no modifier opens "Add a story" (skipped when typing in
 *     a field, or when a modal is already open).
 */

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean((el as HTMLElement).isContentEditable);
}

export default function StoriesPage() {
  const stories = useSyncExternalStore(
    subscribeStories,
    getStoriesSnapshot,
    getStoriesServerSnapshot,
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Story | null>(null);

  const openAdd = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((story: Story) => {
    setEditing(story);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback((story: Story) => {
    const ok = window.confirm(`Delete "${story.title}"? Can't undo this.`);
    if (!ok) return;
    deleteStory(story.id);
  }, []);

  // "n" hotkey — single-key, no modifiers, ignored while typing or while
  // the form is already open. Matches the convention in shortcuts-help.tsx.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (isTypingTarget(document.activeElement)) return;
      if (formOpen) return;
      e.preventDefault();
      openAdd();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, openAdd]);

  // Newest first — same order as readStories returns.
  const total = stories.length;

  return (
    <div className="mx-auto max-w-4xl">
      <Masthead count={total} onAdd={openAdd} />

      {total === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <ol
          aria-label="Filed entries"
          className="mt-2 space-y-10 md:space-y-14"
        >
          {stories.map((story, idx) => (
            <li key={story.id}>
              <StoryCard
                story={story}
                index={total - idx}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ol>
      )}

      {total > 0 && (
        <footer className="mt-16 border-t border-[oklch(0.55_0.05_40_/_0.35)] pt-6 text-center font-[family-name:var(--font-stories-mono)] text-[10px] tracking-[0.32em] text-[oklch(0.45_0.05_38)] smallcaps">
          End of file · {total} {total === 1 ? "entry" : "entries"} on record
        </footer>
      )}

      <StoryForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          /* useSyncExternalStore re-renders the list automatically. */
        }}
      />
    </div>
  );
}
