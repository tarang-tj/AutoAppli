/**
 * Unit tests for the JD keyword extractor.
 *
 * Run with `npx vitest run src/lib/tools`.
 */

import { describe, expect, test } from "vitest";
import { extractKeywords, findMissingKeywords } from "../keyword-extract";

describe("extractKeywords — empty / trivial", () => {
  test("empty string returns empty array", () => {
    expect(extractKeywords("")).toEqual([]);
  });

  test("whitespace-only returns empty array", () => {
    expect(extractKeywords("    \n\t   ")).toEqual([]);
  });

  test("only stopwords returns empty array", () => {
    expect(extractKeywords("the and of to in or for")).toEqual([]);
  });
});

describe("extractKeywords — single-word extraction", () => {
  test("pulls a frequent technical term to the top", () => {
    const text =
      "We use Python every day. Python is required. Strong Python skills preferred.";
    const result = extractKeywords(text);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].term).toBe("python");
    expect(result[0].frequency).toBe(3);
  });

  test("filters generic JD filler ('experience', 'required', 'skills')", () => {
    const text =
      "Required experience: strong skills. Required skills: experience required.";
    const result = extractKeywords(text);
    const terms = result.map((k) => k.term);
    expect(terms).not.toContain("experience");
    expect(terms).not.toContain("required");
    expect(terms).not.toContain("skills");
    expect(terms).not.toContain("strong");
  });

  test("filters basic stopwords", () => {
    const result = extractKeywords(
      "We are looking for a developer who can write Go and rust code.",
    );
    const terms = result.map((k) => k.term);
    expect(terms).not.toContain("the");
    expect(terms).not.toContain("for");
    expect(terms).not.toContain("we");
  });
});

describe("extractKeywords — multi-word terms", () => {
  test("'machine learning' is detected as one bigram", () => {
    const text =
      "We need a machine learning engineer with machine learning experience.";
    const result = extractKeywords(text);
    const terms = result.map((k) => k.term);
    expect(terms).toContain("machine learning");
  });

  test("bigram tokens are not also counted as unigrams", () => {
    const text = "Strong machine learning background. Machine learning required.";
    const result = extractKeywords(text);
    const terms = result.map((k) => k.term);
    expect(terms).toContain("machine learning");
    // The constituent "learning" should not appear on its own with the
    // same count, because both occurrences were consumed by the bigram.
    const learningEntry = result.find((k) => k.term === "learning");
    expect(learningEntry).toBeUndefined();
  });

  test("'data science' bigram detected", () => {
    const result = extractKeywords(
      "Data science role on the data science platform team.",
    );
    expect(result.map((k) => k.term)).toContain("data science");
  });
});

describe("extractKeywords — scoring & ordering", () => {
  test("results sorted by weight descending", () => {
    const text =
      "Python Python Python. React React. TypeScript. Postgres.";
    const result = extractKeywords(text);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].weight).toBeGreaterThanOrEqual(result[i].weight);
    }
  });

  test("early-occurring term gets a weight bonus over a later same-frequency term", () => {
    // Both 'python' and 'kotlin' appear once, but python is in the first
    // 200 chars, kotlin only in the latter half.
    const filler = "additional context ".repeat(20); // ~400 chars of filler
    const text = `Python role. ${filler} kotlin engineer.`;
    const result = extractKeywords(text);
    const py = result.find((k) => k.term === "python");
    const kt = result.find((k) => k.term === "kotlin");
    expect(py).toBeDefined();
    expect(kt).toBeDefined();
    expect(py!.weight).toBeGreaterThan(kt!.weight);
  });

  test("respects topN option", () => {
    const text =
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega";
    const result = extractKeywords(text, { topN: 5 });
    expect(result.length).toBeLessThanOrEqual(5);
  });

  test("default topN is 18", () => {
    const text =
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega";
    const result = extractKeywords(text);
    expect(result.length).toBeLessThanOrEqual(18);
  });
});

describe("findMissingKeywords", () => {
  test("returns JD keywords not present in resume", () => {
    const jdKeywords = [
      { term: "python", frequency: 3, weight: 4.5 },
      { term: "kubernetes", frequency: 2, weight: 3 },
      { term: "react", frequency: 1, weight: 1 },
    ];
    const resume = "I have used Python and React in production.";
    const missing = findMissingKeywords(jdKeywords, resume);
    expect(missing.map((k) => k.term)).toEqual(["kubernetes"]);
  });

  test("empty resume returns empty array (no signal to display)", () => {
    const jdKeywords = [{ term: "python", frequency: 1, weight: 1 }];
    expect(findMissingKeywords(jdKeywords, "")).toEqual([]);
  });

  test("matches case-insensitively", () => {
    const jdKeywords = [{ term: "kubernetes", frequency: 1, weight: 1 }];
    const resume = "Worked extensively with KUBERNETES on prod clusters.";
    expect(findMissingKeywords(jdKeywords, resume)).toEqual([]);
  });
});
