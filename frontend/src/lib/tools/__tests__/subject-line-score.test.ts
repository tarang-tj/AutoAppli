/**
 * Unit tests for the subject-line scorer.
 *
 * Scope: pure-logic only. UI rendering is covered separately if needed.
 * Run with `npx vitest run src/lib/tools`.
 */

import { describe, expect, test } from "vitest";
import { scoreSubjectLine } from "../subject-line-score";

describe("scoreSubjectLine — empty input", () => {
  test("returns 0 / weak with a hint signal", () => {
    const r = scoreSubjectLine("");
    expect(r.score).toBe(0);
    expect(r.category).toBe("weak");
    expect(r.signals.length).toBeGreaterThan(0);
    expect(r.suggestions).toBeDefined();
  });

  test("whitespace-only is treated as empty", () => {
    const r = scoreSubjectLine("   \n\t  ");
    expect(r.score).toBe(0);
    expect(r.category).toBe("weak");
  });
});

describe("scoreSubjectLine — sweet-spot length", () => {
  test("5–7 word specific subject scores at least in the ok band", () => {
    const r = scoreSubjectLine("Question about the data infra role");
    expect(r.score).toBeGreaterThanOrEqual(6);
    // No spam phrase warnings.
    expect(r.signals.join(" ").toLowerCase()).not.toContain("recruiter-template");
  });

  test("strong (8+) subjects do not include suggestions", () => {
    const r = scoreSubjectLine("CMU junior — your 2024 talk on Stripe");
    if (r.score >= 7) {
      expect(r.suggestions).toBeUndefined();
    }
  });
});

describe("scoreSubjectLine — too short", () => {
  test("two-word subject is penalized", () => {
    const r = scoreSubjectLine("Hello there");
    expect(r.score).toBeLessThan(5);
    expect(r.category).toBe("weak");
    expect(r.signals.join(" ")).toMatch(/short/i);
    expect(r.suggestions).toBeDefined();
  });
});

describe("scoreSubjectLine — too long", () => {
  test("12-word subject is penalized for length", () => {
    const r = scoreSubjectLine(
      "I would love to learn more about your wonderful company and team please",
    );
    expect(r.score).toBeLessThan(7);
    expect(r.signals.join(" ")).toMatch(/long/i);
  });
});

describe("scoreSubjectLine — spam phrases", () => {
  test("'quick question' is flagged", () => {
    const r = scoreSubjectLine("Quick question about your team");
    expect(r.signals.join(" ").toLowerCase()).toContain("quick question");
    expect(r.score).toBeLessThan(7);
  });

  test("'just checking in' is flagged", () => {
    const r = scoreSubjectLine("Just checking in about the role");
    expect(r.signals.join(" ").toLowerCase()).toContain("just checking in");
  });

  test("multiple spam phrases stack penalties", () => {
    const single = scoreSubjectLine("Reaching out about the team");
    const double = scoreSubjectLine("Reaching out and circling back");
    expect(double.score).toBeLessThanOrEqual(single.score);
  });
});

describe("scoreSubjectLine — specificity bonuses", () => {
  test("named person triggers a specificity signal", () => {
    const r = scoreSubjectLine("Question for Jane Doe at Stripe");
    expect(r.signals.join(" ")).toMatch(/Jane Doe/);
  });

  test("role title triggers a specificity signal", () => {
    const r = scoreSubjectLine("Backend engineer internship — quick ask");
    const signalText = r.signals.join(" ").toLowerCase();
    expect(signalText).toMatch(/role|engineer/);
  });
});

describe("scoreSubjectLine — punctuation", () => {
  test("multiple question marks penalized", () => {
    const r = scoreSubjectLine("Anyone home??? Hiring??");
    expect(r.signals.join(" ").toLowerCase()).toMatch(/yelling|question/);
    expect(r.score).toBeLessThan(7);
  });

  test("ALL CAPS shouting penalized", () => {
    const r = scoreSubjectLine("HIRING for the data role");
    expect(r.signals.join(" ").toLowerCase()).toMatch(/shouting/);
  });

  test("acronyms like SQL are not penalized as shouting", () => {
    const r = scoreSubjectLine("SQL question for your data team");
    expect(r.signals.join(" ").toLowerCase()).not.toMatch(/shouting/);
  });
});

describe("scoreSubjectLine — Re:/Fwd: prefix", () => {
  test("fake-thread prefix penalized", () => {
    const r = scoreSubjectLine("Re: the internship role we discussed");
    expect(r.signals.join(" ").toLowerCase()).toMatch(/re:|fwd:|fake/);
  });
});

describe("scoreSubjectLine — categories & suggestions", () => {
  test("category buckets line up with score", () => {
    const weak = scoreSubjectLine("Hi");
    expect(weak.category).toBe("weak");
    const ok = scoreSubjectLine("Quick question about Stripe role");
    // Spam-phrase + role mention → ok-ish.
    expect(["weak", "ok"]).toContain(ok.category);
    const strong = scoreSubjectLine("CMU junior — your 2024 talk on Stripe");
    expect(["ok", "strong"]).toContain(strong.category);
  });

  test("suggestions appear when score < 7", () => {
    const r = scoreSubjectLine("Hello");
    expect(r.suggestions).toBeDefined();
    expect(r.suggestions!.length).toBeGreaterThan(0);
  });

  test("score is always 0–10 and integer-rounded", () => {
    const cases = [
      "",
      "Hi",
      "Quick question about your team",
      "CMU junior — your 2024 talk on Stripe",
      "HIRING NOW NOW NOW NOW NOW NOW",
    ];
    for (const c of cases) {
      const r = scoreSubjectLine(c);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(10);
      expect(Number.isInteger(r.score)).toBe(true);
    }
  });
});
