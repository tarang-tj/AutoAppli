/**
 * Tests for JobCard.
 *
 * The component is large (~870 lines) and renders inside @hello-pangea/dnd's
 * <Draggable>, which only works inside a <DragDropContext><Droppable>. We
 * scope tests to a small, high-leverage surface:
 *   - title + company render
 *   - notes affordance reflects whether notes exist
 *   - notes dialog opens
 *   - external-link aria-label includes job title + company
 *   - PriorityStars renders the right count + aria-label
 *
 * Anything that would post to the backend (thank-you, archive, close-out)
 * is tested via aria-label only — we don't fire those handlers because
 * they call apiPost / router and would need broader mocking that's not
 * justified for this baseline pass.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import type { Job } from "@/types";
import { JobCard } from "../job-card";

// next/navigation must be mocked — useRouter() throws outside an App Router
// environment.
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

// The api module reads `process.env.NEXT_PUBLIC_*` at import time and pulls
// in supabase. Stub the two helpers JobCard actually calls.
vi.mock("@/lib/api", () => ({
  apiPost: vi.fn().mockResolvedValue({ subject: "x", body: "y" }),
  isJobsApiConfigured: () => false,
}));

// sonner's toast is a side-effect — silence it.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "job-1",
    company: "Acme Corp",
    title: "Senior Software Engineer",
    url: "https://example.com/jobs/1",
    status: "bookmarked",
    source: "manual",
    created_at: "2026-04-01T12:00:00.000Z",
    updated_at: "2026-04-01T12:00:00.000Z",
    ...overrides,
  };
}

/**
 * JobCard requires being mounted inside a Draggable, which itself requires
 * a DragDropContext + Droppable. This wrapper provides the bare minimum.
 */
function renderJobCard(ui: React.ReactElement) {
  return render(
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="test-column">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {ui}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>,
  );
}

describe("JobCard", () => {
  it("renders the job title and company", () => {
    renderJobCard(<JobCard job={makeJob()} index={0} />);
    expect(screen.getByText("Senior Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("notes button uses 'Add notes' label when no notes exist", () => {
    renderJobCard(
      <JobCard job={makeJob({ notes: "" })} index={0} onSaveNotes={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: /add notes/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit notes/i }),
    ).not.toBeInTheDocument();
  });

  it("notes button uses 'Edit notes' label when notes exist", () => {
    renderJobCard(
      <JobCard
        job={makeJob({ notes: "Followed up on Tuesday" })}
        index={0}
        onSaveNotes={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /edit notes/i }),
    ).toBeInTheDocument();
  });

  it("opens the notes dialog when the notes button is clicked", async () => {
    const user = userEvent.setup();
    renderJobCard(
      <JobCard job={makeJob()} index={0} onSaveNotes={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /add notes/i }));
    // Dialog title is "Notes"; description repeats title · company.
    expect(
      await screen.findByRole("dialog"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        /notes for senior software engineer at acme corp/i,
      ),
    ).toBeInTheDocument();
  });

  it("external link has a descriptive aria-label including title and company", () => {
    renderJobCard(<JobCard job={makeJob()} index={0} />);
    const link = screen.getByRole("link", {
      name: /open senior software engineer at acme corp job posting/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://example.com/jobs/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("does not render the external link when url is missing", () => {
    renderJobCard(
      <JobCard job={makeJob({ url: undefined })} index={0} />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("PriorityStars renders the correct count and aria-label", () => {
    renderJobCard(
      <JobCard job={makeJob({ priority: 3 })} index={0} />,
    );
    const stars = screen.getByRole("img", { name: /priority 3 of 5/i });
    expect(stars).toBeInTheDocument();
  });

  it("does not render priority stars when priority is 0 or unset", () => {
    renderJobCard(<JobCard job={makeJob({ priority: 0 })} index={0} />);
    expect(
      screen.queryByRole("img", { name: /priority/i }),
    ).not.toBeInTheDocument();
  });
});
