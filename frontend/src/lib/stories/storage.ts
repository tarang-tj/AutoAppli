/**
 * Story Library — localStorage persistence layer.
 *
 * STAR-format stories that students bank once and reuse across every
 * interview. v1 lives in localStorage only; the versioned key
 * (`autoappli_stories_v1`) keeps a future Supabase migration clean.
 *
 * SSR safety: every helper guards on `typeof window` and falls back to
 * an empty array on the server. The `getStoriesServerSnapshot` export
 * is the canonical SSR snapshot for `useSyncExternalStore`.
 *
 * Same-tab notification: `writeStory`/`deleteStory` dispatch a
 * `StorageEvent` so subscribers re-snapshot immediately. The native
 * `storage` event only fires across tabs.
 */

export type StoryTag =
  | "leadership"
  | "conflict"
  | "technical"
  | "failure"
  | "ambiguity"
  | "deadline"
  | "teamwork"
  | "ownership"
  | "communication"
  | "creativity";

export const STORY_TAGS: readonly StoryTag[] = [
  "leadership",
  "conflict",
  "technical",
  "failure",
  "ambiguity",
  "deadline",
  "teamwork",
  "ownership",
  "communication",
  "creativity",
] as const;

export interface Story {
  id: string;
  title: string;
  tags: StoryTag[];
  situation: string;
  task: string;
  action: string;
  result: string;
  createdAt: number;
  updatedAt: number;
}

export const STORIES_KEY = "autoappli_stories_v1";

const EMPTY: Story[] = [];

function isStoryTag(v: unknown): v is StoryTag {
  return typeof v === "string" && (STORY_TAGS as readonly string[]).includes(v);
}

function isStory(v: unknown): v is Story {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    Array.isArray(s.tags) &&
    s.tags.every(isStoryTag) &&
    typeof s.situation === "string" &&
    typeof s.task === "string" &&
    typeof s.action === "string" &&
    typeof s.result === "string" &&
    typeof s.createdAt === "number" &&
    typeof s.updatedAt === "number"
  );
}

function lsGet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORIES_KEY);
  } catch {
    return null;
  }
}

function lsSet(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORIES_KEY, value);
    // Same-tab notification — useSyncExternalStore subscribers wake up.
    window.dispatchEvent(new StorageEvent("storage", { key: STORIES_KEY }));
  } catch {
    /* private browsing / quota — silently ignore */
  }
}

export function readStories(): Story[] {
  const raw = lsGet();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStory);
  } catch {
    return [];
  }
}

function writeAll(stories: Story[]): void {
  lsSet(JSON.stringify(stories));
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Deterministic fallback for environments without crypto.randomUUID.
  return `story_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type StoryInput = Omit<Story, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

/**
 * Upsert a story. When `input.id` matches an existing story, updates it
 * in place and bumps `updatedAt`. When omitted (or unmatched), creates a
 * new story with a fresh id and `createdAt = updatedAt = Date.now()`.
 */
export function writeStory(input: StoryInput): Story {
  const now = Date.now();
  const all = readStories();

  if (input.id) {
    const idx = all.findIndex((s) => s.id === input.id);
    if (idx >= 0) {
      const updated: Story = {
        ...all[idx],
        title: input.title,
        tags: input.tags,
        situation: input.situation,
        task: input.task,
        action: input.action,
        result: input.result,
        updatedAt: now,
      };
      const next = all.slice();
      next[idx] = updated;
      writeAll(next);
      return updated;
    }
  }

  const created: Story = {
    id: input.id ?? newId(),
    title: input.title,
    tags: input.tags,
    situation: input.situation,
    task: input.task,
    action: input.action,
    result: input.result,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([created, ...all]);
  return created;
}

export function deleteStory(id: string): void {
  const all = readStories();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) return;
  writeAll(next);
}

// ─── External-store subscription helpers ──────────────────────────────

export function subscribeStories(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORIES_KEY || e.key === null) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export function getStoriesSnapshot(): Story[] {
  return readStories();
}

export function getStoriesServerSnapshot(): Story[] {
  return EMPTY;
}
