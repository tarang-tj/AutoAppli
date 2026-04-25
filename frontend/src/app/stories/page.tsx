"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { BookText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryCard } from "@/components/stories/story-card";
import { StoryForm } from "@/components/stories/story-form";
import {
  deleteStory,
  getStoriesServerSnapshot,
  getStoriesSnapshot,
  subscribeStories,
  type Story,
} from "@/lib/stories/storage";

/**
 * /stories — Story Library page.
 *
 * v1 is localStorage-only. The list subscribes via useSyncExternalStore
 * (matches the OnboardingTour / ThemeToggle pattern in this codebase) so
 * any write from the form propagates instantly without lifted state.
 *
 * Page-level keyboard affordances:
 *   - "n" with no modifier opens "Add a story" (skipped when typing in
 *     a field). Same convention used elsewhere in the app shell.
 */

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
    const ok = window.confirm(
      `Delete "${story.title}"? Can't undo this.`,
    );
    if (!ok) return;
    deleteStory(story.id);
  }, []);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-50">
            <BookText aria-hidden="true" className="h-6 w-6 text-blue-400" />
            Story Library
          </h1>
          <p className="mt-1 text-sm text-zinc-300 leading-relaxed max-w-2xl">
            Bank your strongest stories once. Reuse them across every interview.
          </p>
        </div>
        <Button
          onClick={openAdd}
          aria-label="Add a story"
          className="shrink-0"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add a story
        </Button>
      </header>

      {stories.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <ul role="list" className="space-y-3">
          {stories.map((story) => (
            <li key={story.id}>
              <StoryCard
                story={story}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center"
    >
      <div className="mx-auto h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
        <BookText aria-hidden="true" className="h-6 w-6 text-blue-300" />
      </div>
      <p className="mt-4 text-base font-semibold text-zinc-100">
        No stories yet.
      </p>
      <p className="mt-1 text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
        The grind goes faster when you&rsquo;ve got 8&ndash;10 strong ones
        banked. One story, four short paragraphs &mdash; that&rsquo;s it.
      </p>
      <div className="mt-5 flex justify-center">
        <Button onClick={onAdd}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add your first story
        </Button>
      </div>
    </div>
  );
}
