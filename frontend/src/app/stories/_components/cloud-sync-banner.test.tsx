/**
 * Tests for CloudSyncBanner.
 *
 * Covers:
 *   1. Banner renders when user is authenticated + localStorage has stories
 *   2. Banner hides after "Not now" dismiss (sessionStorage flag written)
 *   3. Banner does not render when localStorage has no stories
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Module mocks ─────────────────────────────────────────────────────────────

// useUser — control auth state per test.
const mockUseUser = vi.fn();
vi.mock("@/hooks/use-user", () => ({
  useUser: () => mockUseUser(),
}));

// storage helpers — control migration state per test.
const mockHasUnmigrated = vi.fn();
const mockMigrate = vi.fn();
vi.mock("@/lib/stories/storage", () => ({
  hasUnmigratedLocalStories: () => mockHasUnmigrated(),
  migrateLocalStoriesToCloud: () => mockMigrate(),
}));

// sonner — silence toasts, allow assertion.
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { CloudSyncBanner } from "./cloud-sync-banner";

const DISMISS_KEY = "autoappli_stories_sync_dismissed_v1";

function renderBanner() {
  return render(<CloudSyncBanner />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CloudSyncBanner", () => {
  beforeEach(() => {
    // Default: authenticated, un-migrated stories present, not dismissed.
    mockUseUser.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mockHasUnmigrated.mockReturnValue(true);
    mockMigrate.mockResolvedValue(3);
    sessionStorage.removeItem(DISMISS_KEY);
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.removeItem(DISMISS_KEY);
  });

  it("shows the banner when authenticated and localStorage has un-migrated stories", () => {
    mockUseUser.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mockHasUnmigrated.mockReturnValue(true);

    renderBanner();

    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sync to cloud/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /not now/i }),
    ).toBeInTheDocument();
  });

  it("hides when 'Not now' is clicked and writes sessionStorage dismiss flag", async () => {
    mockUseUser.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mockHasUnmigrated.mockReturnValue(true);
    const user = userEvent.setup();

    renderBanner();

    expect(screen.getByRole("note")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /not now/i }));

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe("true");
  });

  it("does not show banner when localStorage has no un-migrated stories", () => {
    mockUseUser.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mockHasUnmigrated.mockReturnValue(false);

    renderBanner();

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("does not show banner when user is not authenticated", () => {
    mockUseUser.mockReturnValue({ user: null, loading: false });
    mockHasUnmigrated.mockReturnValue(true);

    renderBanner();

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("calls migrateLocalStoriesToCloud and shows success toast on sync, then hides", async () => {
    mockUseUser.mockReturnValue({ user: { id: "user-1" }, loading: false });
    mockHasUnmigrated.mockReturnValue(true);
    mockMigrate.mockResolvedValue(2);
    const user = userEvent.setup();

    renderBanner();

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /sync to cloud/i }));
    });

    expect(mockMigrate).toHaveBeenCalledOnce();
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("2 stories synced"),
    );
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
