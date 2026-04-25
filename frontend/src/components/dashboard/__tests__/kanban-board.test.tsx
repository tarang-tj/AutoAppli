/**
 * Tests for KanbanBoard.
 *
 * The board calls useJobs() (SWR-backed) and useMatchScores() (also SWR).
 * We mock both modules so tests don't hit the network. We also mock
 * next/navigation and the api/lib/api module since JobCard sits inside
 * each column and reaches for both.
 *
 * Focus:
 *   - all six columns render in the documented order
 *   - each column's aria-label encodes the count and pluralizes correctly
 *   - empty columns still render with "0 jobs"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Job } from "@/types";

// ── Mocks ────────────────────────────────────────────────────────────────

// Default to "no jobs" — individual tests can override via vi.mocked().
const useJobsMock = vi.fn(() => ({
  jobs: [] as Job[],
  isLoading: false,
  error: undefined,
  mutate: vi.fn(),
  updateJobStatus: vi.fn(),
  reorderJobsInColumn: vi.fn(),
  persistColumnOrder: vi.fn(),
  deleteJob: vi.fn(),
  patchJob: vi.fn(),
  closeOutJob: vi.fn(),
  archiveJob: vi.fn(),
}));

vi.mock("@/hooks/use-jobs", () => ({
  useJobs: () => useJobsMock(),
}));

vi.mock("@/hooks/use-match-scores", () => ({
  useMatchScores: () => ({ scores: {}, isLoading: false, hasResume: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  apiPost: vi.fn(),
  isJobsApiConfigured: () => false,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ── Helpers ──────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<Job> & Pick<Job, "id" | "status">): Job {
  return {
    company: "Acme",
    title: "Engineer",
    url: "https://example.com/j",
    source: "manual",
    created_at: "2026-04-01T12:00:00.000Z",
    updated_at: "2026-04-01T12:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  useJobsMock.mockReturnValue({
    jobs: [],
    isLoading: false,
    error: undefined,
    mutate: vi.fn(),
    updateJobStatus: vi.fn(),
    reorderJobsInColumn: vi.fn(),
    persistColumnOrder: vi.fn(),
    deleteJob: vi.fn(),
    patchJob: vi.fn(),
    closeOutJob: vi.fn(),
    archiveJob: vi.fn(),
  });
});

// Import KanbanBoard AFTER vi.mock so the mocks resolve correctly.
import { KanbanBoard } from "../kanban-board";

// ── Tests ────────────────────────────────────────────────────────────────

describe("KanbanBoard", () => {
  it("renders all 6 columns in the documented order", () => {
    render(<KanbanBoard />);
    const expected = [
      /bookmarked/i,
      /applied/i,
      /interviewing/i,
      /offer/i,
      /rejected/i,
      /ghosted/i,
    ];
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expected.forEach((re, i) => {
      expect(items[i]).toHaveAccessibleName(re);
    });
  });

  it("uses '0 jobs' (plural) for an empty column", () => {
    render(<KanbanBoard />);
    expect(
      screen.getByRole("listitem", { name: /bookmarked — 0 jobs/i }),
    ).toBeInTheDocument();
  });

  it("uses '1 job' (singular) for a column with exactly one job", () => {
    useJobsMock.mockReturnValue({
      jobs: [makeJob({ id: "a", status: "applied" })],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      updateJobStatus: vi.fn(),
      reorderJobsInColumn: vi.fn(),
      persistColumnOrder: vi.fn(),
      deleteJob: vi.fn(),
      patchJob: vi.fn(),
      closeOutJob: vi.fn(),
      archiveJob: vi.fn(),
    });
    render(<KanbanBoard />);
    expect(
      screen.getByRole("listitem", { name: /applied — 1 job\b/i }),
    ).toBeInTheDocument();
  });

  it("uses 'N jobs' (plural) for a column with multiple jobs", () => {
    useJobsMock.mockReturnValue({
      jobs: [
        makeJob({ id: "a", status: "interviewing" }),
        makeJob({ id: "b", status: "interviewing" }),
        makeJob({ id: "c", status: "interviewing" }),
      ],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      updateJobStatus: vi.fn(),
      reorderJobsInColumn: vi.fn(),
      persistColumnOrder: vi.fn(),
      deleteJob: vi.fn(),
      patchJob: vi.fn(),
      closeOutJob: vi.fn(),
      archiveJob: vi.fn(),
    });
    render(<KanbanBoard />);
    expect(
      screen.getByRole("listitem", { name: /interviewing — 3 jobs/i }),
    ).toBeInTheDocument();
  });

  it("renders the loading skeleton when isLoading is true", () => {
    useJobsMock.mockReturnValue({
      jobs: [],
      isLoading: true,
      error: undefined,
      mutate: vi.fn(),
      updateJobStatus: vi.fn(),
      reorderJobsInColumn: vi.fn(),
      persistColumnOrder: vi.fn(),
      deleteJob: vi.fn(),
      patchJob: vi.fn(),
      closeOutJob: vi.fn(),
      archiveJob: vi.fn(),
    });
    render(<KanbanBoard />);
    // Skeleton state has no listitems (the real columns aren't mounted).
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("filters archived jobs out of the count by default", () => {
    useJobsMock.mockReturnValue({
      jobs: [
        makeJob({ id: "a", status: "applied" }),
        makeJob({ id: "b", status: "applied", archived: true }),
      ],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      updateJobStatus: vi.fn(),
      reorderJobsInColumn: vi.fn(),
      persistColumnOrder: vi.fn(),
      deleteJob: vi.fn(),
      patchJob: vi.fn(),
      closeOutJob: vi.fn(),
      archiveJob: vi.fn(),
    });
    render(<KanbanBoard />);
    expect(
      screen.getByRole("listitem", { name: /applied — 1 job\b/i }),
    ).toBeInTheDocument();
  });

  it("includes archived jobs in the count when showArchived is true", () => {
    useJobsMock.mockReturnValue({
      jobs: [
        makeJob({ id: "a", status: "applied" }),
        makeJob({ id: "b", status: "applied", archived: true }),
      ],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      updateJobStatus: vi.fn(),
      reorderJobsInColumn: vi.fn(),
      persistColumnOrder: vi.fn(),
      deleteJob: vi.fn(),
      patchJob: vi.fn(),
      closeOutJob: vi.fn(),
      archiveJob: vi.fn(),
    });
    render(<KanbanBoard showArchived />);
    expect(
      screen.getByRole("listitem", { name: /applied — 2 jobs/i }),
    ).toBeInTheDocument();
  });
});
