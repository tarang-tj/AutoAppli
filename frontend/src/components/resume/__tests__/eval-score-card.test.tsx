/**
 * Tests for EvalScoreCard — the four-ring eval summary plus the three
 * expandable detail sections (keywords / hallucination / change-delta).
 *
 * We assert on user-visible affordances and ARIA state, not on style or
 * the SVG donut math (that's covered by snapshot of color thresholds in
 * the source itself, plus visual review).
 */
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvalScoreCard, type EvalResult } from "../eval-score-card";

const fixture: EvalResult = {
  overall_score: 82,
  keyword_coverage: {
    score: 75,
    matched: ["python", "fastapi", "aws"],
    missing: ["kubernetes", "graphql"],
    total_keywords: 5,
  },
  hallucination_check: {
    score: 95,
    hallucinated_skills: [],
    hallucinated_credentials: [],
  },
  change_delta: {
    score: 70,
    change_percent: 35,
    similarity_ratio: 0.65,
    verdict: "well_tailored",
    added_sentences: 4,
    removed_sentences: 2,
  },
};

describe("EvalScoreCard", () => {
  it("renders all four score rings with correct numbers and labels", () => {
    render(<EvalScoreCard eval_result={fixture} />);
    expect(
      screen.getByRole("img", { name: /overall score: 82 out of 100/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /keywords score: 75 out of 100/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /accuracy score: 95 out of 100/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /tailoring score: 70 out of 100/i }),
    ).toBeInTheDocument();
  });

  it("starts every detail section collapsed", () => {
    render(<EvalScoreCard eval_result={fixture} />);
    const buttons = screen.getAllByRole("button", { expanded: false });
    // 3 sections: Keyword Coverage, Hallucination Check, Change Delta.
    expect(buttons.length).toBeGreaterThanOrEqual(3);
    expect(
      screen.getByRole("button", { name: /keyword coverage/i }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: /hallucination check/i }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("button", { name: /change delta/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("expands the keyword section on click and reveals matched/missing tags", async () => {
    const user = userEvent.setup();
    render(<EvalScoreCard eval_result={fixture} />);
    const trigger = screen.getByRole("button", { name: /keyword coverage/i });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Matched keywords visible
    expect(screen.getByText("python")).toBeInTheDocument();
    expect(screen.getByText("fastapi")).toBeInTheDocument();
    expect(screen.getByText("aws")).toBeInTheDocument();
    // Missing keywords visible
    expect(screen.getByText("kubernetes")).toBeInTheDocument();
    expect(screen.getByText("graphql")).toBeInTheDocument();
    // Coverage summary mentions counts
    expect(
      screen.getByText(/3 of 5 key terms/i),
    ).toBeInTheDocument();
  });

  it("hallucination section shows the all-clear message when nothing is fabricated", async () => {
    const user = userEvent.setup();
    render(<EvalScoreCard eval_result={fixture} />);
    await user.click(
      screen.getByRole("button", { name: /hallucination check/i }),
    );
    expect(
      screen.getByText(/no fabricated skills or credentials detected/i),
    ).toBeInTheDocument();
  });

  it("hallucination section lists fabricated items when they exist", async () => {
    const user = userEvent.setup();
    const withFabrications: EvalResult = {
      ...fixture,
      hallucination_check: {
        score: 50,
        hallucinated_skills: ["rust", "elixir"],
        hallucinated_credentials: ["PhD"],
      },
    };
    render(<EvalScoreCard eval_result={withFabrications} />);
    await user.click(
      screen.getByRole("button", { name: /hallucination check/i }),
    );
    expect(screen.getByText("rust")).toBeInTheDocument();
    expect(screen.getByText("elixir")).toBeInTheDocument();
    expect(screen.getByText("PhD")).toBeInTheDocument();
    expect(
      screen.getByText(/skills not in original/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/credentials not in original/i),
    ).toBeInTheDocument();
  });

  it("change-delta section surfaces the verdict and sentence counts", async () => {
    const user = userEvent.setup();
    render(<EvalScoreCard eval_result={fixture} />);
    await user.click(screen.getByRole("button", { name: /change delta/i }));
    // Verdict label maps "well_tailored" -> "Good amount of tailoring"
    expect(
      screen.getByText(/good amount of tailoring/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/4 new sentences/i)).toBeInTheDocument();
    expect(screen.getByText(/2 removed/i)).toBeInTheDocument();
  });

  it("shows the score next to each section trigger", () => {
    render(<EvalScoreCard eval_result={fixture} />);
    const keyword = screen.getByRole("button", { name: /keyword coverage/i });
    // The numeric badge inside the trigger has its own aria-label.
    expect(
      within(keyword).getByLabelText(/score 75 out of 100/i),
    ).toBeInTheDocument();
  });
});
