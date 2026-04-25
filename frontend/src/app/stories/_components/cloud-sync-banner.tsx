"use client";

/**
 * CloudSyncBanner — dismissable migration prompt on /stories.
 *
 * Visible only when:
 *   1. User is authenticated (useUser returns a non-null user)
 *   2. localStorage has un-migrated stories (hasUnmigratedLocalStories)
 *   3. User hasn't dismissed the banner this session
 *
 * "Sync to cloud" → calls migrateLocalStoriesToCloud → sonner success toast.
 * "Not now" → writes sessionStorage key → hides for the session.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-user";
import {
  hasUnmigratedLocalStories,
  migrateLocalStoriesToCloud,
} from "@/lib/stories/storage";

const DISMISS_KEY = "autoappli_stories_sync_dismissed_v1";

export function CloudSyncBanner() {
  const { user, loading } = useUser();

  // All three conditions are evaluated client-side after hydration to avoid
  // a server/client mismatch (localStorage is not available on the server).
  const [visible, setVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (typeof window === "undefined") return;

    // Dismissed for this session?
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "true") return;
    } catch {
      // sessionStorage blocked (private mode) — don't show banner
      return;
    }

    if (hasUnmigratedLocalStories()) {
      setVisible(true);
    }
  }, [user, loading]);

  function dismiss() {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      /* sessionStorage unavailable — still hide in-memory */
    }
    setVisible(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const count = await migrateLocalStoriesToCloud();
      if (count > 0) {
        toast.success(
          `${count} ${count === 1 ? "story" : "stories"} synced to your account.`,
        );
      } else {
        toast.success("Your stories are already up to date.");
      }
    } catch {
      toast.error("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <aside
      role="note"
      aria-label="Cloud sync available"
      className="mb-8 flex flex-col gap-4 border border-[oklch(0.55_0.05_40_/_0.4)] bg-[oklch(0.975_0.008_85)] p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-1">
        <p className="font-[family-name:var(--font-stories-mono)] text-[11px] tracking-[0.28em] text-[oklch(0.42_0.06_38)] smallcaps">
          Local stories found
        </p>
        <p className="font-[family-name:var(--font-stories-display)] text-[0.95rem] leading-[1.55] text-[oklch(0.22_0.02_30)]">
          You have stories saved on this device. Sync them to your account so
          they&apos;re available everywhere.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          aria-busy={syncing}
          className="inline-flex items-center gap-2 border border-[oklch(0.18_0.02_30)] bg-[oklch(0.18_0.02_30)] px-4 py-2 font-[family-name:var(--font-stories-mono)] text-[11px] tracking-[0.2em] text-[oklch(0.97_0.012_85)] transition-colors hover:bg-[oklch(0.32_0.07_28)] hover:border-[oklch(0.32_0.07_28)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)] focus-visible:ring-[oklch(0.34_0.07_28)]"
        >
          {syncing ? "Syncing…" : "Sync to cloud"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          disabled={syncing}
          className="font-[family-name:var(--font-stories-mono)] text-[11px] tracking-[0.2em] text-[oklch(0.45_0.05_38)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.34_0.07_28)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.965_0.012_85)]"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
