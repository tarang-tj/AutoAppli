/**
 * Tests for the resume TemplatePicker — the small "Harvard Classic" /
 * "Modern Clean" segmented control rendered in the ResumePreview header.
 *
 * Scope is intentionally narrow: rendering, ARIA, and click → onChange.
 * Arrow-key roving focus is NOT tested because the current implementation
 * uses native <button role="radio">s without a roving tabindex; the W3C
 * pattern says they should support arrow keys, but this picker doesn't.
 * Documenting that gap here so the next person can add it deliberately.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplatePicker } from "../template-picker";

describe("TemplatePicker", () => {
  it("renders both template options", () => {
    render(<TemplatePicker value="harvard" onChange={() => {}} />);
    expect(
      screen.getByRole("radio", { name: /harvard classic/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /modern clean/i }),
    ).toBeInTheDocument();
  });

  it("exposes a labeled radiogroup", () => {
    render(<TemplatePicker value="harvard" onChange={() => {}} />);
    const group = screen.getByRole("radiogroup", { name: /resume template/i });
    expect(group).toBeInTheDocument();
  });

  it("reflects initial value via aria-checked on the right option", () => {
    render(<TemplatePicker value="modern" onChange={() => {}} />);
    const harvard = screen.getByRole("radio", { name: /harvard classic/i });
    const modern = screen.getByRole("radio", { name: /modern clean/i });
    expect(harvard).toHaveAttribute("aria-checked", "false");
    expect(modern).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange with the selected id when a different option is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TemplatePicker value="harvard" onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: /modern clean/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("modern");
  });

  it("still fires onChange when the already-selected option is clicked", async () => {
    // The picker is a controlled component; the parent decides how to react.
    // We just verify that the click is forwarded — debouncing is the parent's
    // problem, not ours.
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TemplatePicker value="harvard" onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: /harvard classic/i }));
    expect(onChange).toHaveBeenCalledWith("harvard");
  });
});
