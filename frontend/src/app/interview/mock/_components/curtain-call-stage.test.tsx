/**
 * Tests for CurtainCallStage — per-turn "Save as story" CTA.
 *
 * Covers:
 *   1. CTA renders for turns with answer.length >= 50.
 *   2. CTA is NOT rendered for short answers (< 50 chars).
 *   3. CTA link href contains /stories?import= with a non-empty base64 payload.
 *   4. The "Bank your answers" section is absent when no messages are passed.
 *   5. CTA has an accessible name (aria-label).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CurtainCallStage } from "./curtain-call-stage";
import type { EndResponse } from "@/lib/mock-interview/api";
import type { DialogueLine } from "./dialogue-line";

// next/link renders a client-side router Link; in jsdom we just need a plain
// <a> so that getByRole("link") and href assertions work without a router.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CARD: EndResponse = {
  overall: 72,
  dimensions: { clarity: 70, structure: 75, specificity: 65, relevance: 78 },
  top_strengths: ["Clear examples"],
  top_improvements: ["Add more specifics"],
};

const LONG_ANSWER =
  "During my internship at Acme Corp I was asked to fix a critical bug. " +
  "The task was to resolve a race condition in the payment service. " +
  "I traced the issue through the logs, added a mutex lock, and wrote a regression test. " +
  "The fix shipped within 24 hours and zero regressions were reported.";

const SHORT_ANSWER = "I fixed a bug quickly.";

function makeMessages(question: string, answer: string): DialogueLine[] {
  return [
    { role: "ai", text: question },
    { role: "user", text: answer },
    { role: "ai", text: "Good answer! Consider adding more numbers." },
  ];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CurtainCallStage — per-turn Save as story CTA", () => {
  it("shows no 'Bank your answers' section when messages prop is omitted", () => {
    render(<CurtainCallStage card={CARD} onReset={() => {}} />);
    expect(screen.queryByText(/bank your answers/i)).not.toBeInTheDocument();
  });

  it("shows no CTA for a short answer (< 50 chars)", () => {
    const messages = makeMessages("Tell me about a challenge.", SHORT_ANSWER);
    render(<CurtainCallStage card={CARD} onReset={() => {}} messages={messages} />);
    expect(screen.queryByRole("link", { name: /save as story/i })).not.toBeInTheDocument();
  });

  it("renders a 'Save as story' link for a long answer (>= 50 chars)", () => {
    const messages = makeMessages("Tell me about a time you fixed a bug.", LONG_ANSWER);
    render(<CurtainCallStage card={CARD} onReset={() => {}} messages={messages} />);
    // aria-label provides full context: "Save answer to '<Q>' as a story"
    const link = screen.getByRole("link", { name: /save answer to/i });
    expect(link).toBeInTheDocument();
    // Visible text is also present in the link
    expect(link).toHaveTextContent(/save as story/i);
  });

  it("CTA link points to /stories?import=<non-empty-base64>", () => {
    const messages = makeMessages("Tell me about a time you fixed a bug.", LONG_ANSWER);
    render(<CurtainCallStage card={CARD} onReset={() => {}} messages={messages} />);
    const link = screen.getByRole("link", { name: /save answer to/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).toMatch(/^\/stories\?import=.{10,}/);
  });

  it("CTA link has an accessible aria-label mentioning the question", () => {
    const question = "Tell me about a time you fixed a bug.";
    const messages = makeMessages(question, LONG_ANSWER);
    render(<CurtainCallStage card={CARD} onReset={() => {}} messages={messages} />);
    // aria-label = "Save answer to '<question>' as a story"
    const link = screen.getByRole("link", { name: /save answer to/i });
    expect(link.getAttribute("aria-label")).toMatch(/tell me about/i);
  });

  it("shows multiple CTAs for multiple long-answer turns", () => {
    const messages: DialogueLine[] = [
      { role: "ai", text: "Question one about leadership." },
      { role: "user", text: LONG_ANSWER },
      { role: "ai", text: "Feedback one." },
      { role: "ai", text: "Question two about conflict." },
      { role: "user", text: LONG_ANSWER },
      { role: "ai", text: "Feedback two." },
    ];
    render(<CurtainCallStage card={CARD} onReset={() => {}} messages={messages} />);
    // Two links, each with aria-label matching their respective question
    const links = screen.getAllByRole("link", { name: /save answer to/i });
    expect(links).toHaveLength(2);
  });

  it("shows 'Bank your answers' section heading when there are saveable turns", () => {
    const messages = makeMessages("Describe a challenge.", LONG_ANSWER);
    render(<CurtainCallStage card={CARD} onReset={() => {}} messages={messages} />);
    expect(screen.getByText(/bank your answers as stories/i)).toBeInTheDocument();
  });
});
