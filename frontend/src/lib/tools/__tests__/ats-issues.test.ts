/**
 * Unit tests for the ATS issues detector.
 *
 * Pure-logic only. Each test sets up a parsed-shape fixture (or runs
 * parseAts on a small string) and verifies the right severity issue
 * surfaces.
 */

import { describe, expect, test } from "vitest";
import { detectAtsIssues } from "../ats-issues";
import { parseAts, type AtsParsedResume } from "../ats-parse";

function emptyParsed(overrides: Partial<AtsParsedResume> = {}): AtsParsedResume {
  return {
    contact: {
      name: null,
      email: null,
      phone: null,
      location: null,
      links: [],
    },
    summary: null,
    experience: [],
    skills: [],
    education: [],
    projects: [],
    raw: "",
    characterCount: 0,
    estimatedPages: 0,
    ...overrides,
  };
}

describe("detectAtsIssues — critical signals", () => {
  test("missing email surfaces a CRITICAL issue", () => {
    const issues = detectAtsIssues(emptyParsed(), "");
    expect(issues.some((i) => i.severity === "critical" && /email/i.test(i.message))).toBe(true);
  });

  test("missing phone surfaces a CRITICAL issue", () => {
    const issues = detectAtsIssues(
      emptyParsed({ contact: { name: null, email: "j@x.com", phone: null, location: null, links: [] } }),
      "j@x.com",
    );
    expect(issues.some((i) => i.severity === "critical" && /phone/i.test(i.message))).toBe(true);
  });
});

describe("detectAtsIssues — high signals", () => {
  test("no experience surfaces a HIGH issue", () => {
    const issues = detectAtsIssues(
      emptyParsed({ contact: { name: null, email: "j@x.com", phone: "555-555-5555", location: null, links: [] } }),
      "j@x.com",
    );
    expect(issues.some((i) => i.severity === "high" && /experience/i.test(i.message))).toBe(true);
  });

  test("no skills surfaces a HIGH issue", () => {
    const issues = detectAtsIssues(
      emptyParsed({ contact: { name: null, email: "j@x.com", phone: "555-555-5555", location: null, links: [] } }),
      "",
    );
    expect(issues.some((i) => i.severity === "high" && /skills/i.test(i.message))).toBe(true);
  });

  test("no education surfaces a HIGH issue", () => {
    const issues = detectAtsIssues(
      emptyParsed({ contact: { name: null, email: "j@x.com", phone: "555-555-5555", location: null, links: [] } }),
      "",
    );
    expect(issues.some((i) => i.severity === "high" && /education/i.test(i.message))).toBe(true);
  });

  test("3+ passive bullets surface a HIGH issue", () => {
    const parsed = emptyParsed({
      contact: { name: null, email: "j@x.com", phone: "555-555-5555", location: null, links: [{ label: "LinkedIn", url: "https://linkedin.com/in/x" }] },
      experience: [
        {
          role: "Intern",
          company: "Acme",
          dates: "May 2024 — Aug 2024",
          bullets: [
            "Responsible for reviewing PRs.",
            "Helped with onboarding doc.",
            "Tasked with rewriting the runbook.",
            "Shipped a deduplication pipeline.",
          ],
        },
      ],
      skills: ["Python"],
      education: [{ school: "CMU", degree: "BS CS", dates: "2022 - 2026" }],
      estimatedPages: 1,
    });
    const issues = detectAtsIssues(parsed, "");
    expect(issues.some((i) => i.severity === "high" && /passive/i.test(i.message))).toBe(true);
  });

  test("inconsistent date format surfaces a HIGH issue", () => {
    const parsed = emptyParsed({
      contact: { name: null, email: "j@x.com", phone: "555-555-5555", location: null, links: [{ label: "LinkedIn", url: "https://linkedin.com/in/x" }] },
      experience: [
        {
          role: "Intern",
          company: "Acme",
          dates: "2024-2025",
          bullets: ["Built things."],
        },
      ],
      skills: ["Python"],
      education: [{ school: "CMU", degree: "BS CS", dates: "2022 - 2026" }],
      estimatedPages: 1,
    });
    const issues = detectAtsIssues(parsed, "");
    expect(issues.some((i) => i.severity === "high" && /date format/i.test(i.message))).toBe(true);
  });
});

describe("detectAtsIssues — medium signals", () => {
  test("page count > 2 surfaces a MEDIUM issue", () => {
    const parsed = emptyParsed({
      contact: { name: null, email: "j@x.com", phone: "555-555-5555", location: null, links: [{ label: "LinkedIn", url: "https://linkedin.com/in/x" }] },
      experience: [
        { role: "R", company: "C", dates: "May 2024 — Aug 2024", bullets: ["Shipped."] },
      ],
      skills: ["Python"],
      education: [{ school: "CMU", degree: "BS CS", dates: "2022 - 2026" }],
      estimatedPages: 2.5,
    });
    const issues = detectAtsIssues(parsed, "");
    expect(issues.some((i) => i.severity === "medium" && /page/i.test(i.message))).toBe(true);
  });

  test("inconsistent bullet glyphs surface a MEDIUM issue", () => {
    const raw = "EXPERIENCE\n• built things\n- did stuff\n* shipped pipeline\n";
    const parsed = emptyParsed({
      contact: { name: null, email: "j@x.com", phone: "555-555-5555", location: null, links: [{ label: "LinkedIn", url: "https://linkedin.com/in/x" }] },
      experience: [
        { role: "R", company: "C", dates: "May 2024 — Aug 2024", bullets: ["x"] },
      ],
      skills: ["Python"],
      education: [{ school: "CMU", degree: "BS CS", dates: "2022 - 2026" }],
      raw,
      characterCount: raw.length,
      estimatedPages: 0.6,
    });
    const issues = detectAtsIssues(parsed, raw);
    expect(issues.some((i) => i.severity === "medium" && /glyph/i.test(i.message))).toBe(true);
  });

  test("tabs detected surfaces a MEDIUM issue", () => {
    const raw = "Jane Doe\tjane@x.com\n";
    const parsed = emptyParsed({
      contact: { name: "Jane Doe", email: "jane@x.com", phone: "555-555-5555", location: null, links: [{ label: "LinkedIn", url: "https://linkedin.com/in/x" }] },
      experience: [
        { role: "R", company: "C", dates: "May 2024 — Aug 2024", bullets: ["x"] },
      ],
      skills: ["Python"],
      education: [{ school: "CMU", degree: "BS CS", dates: "2022 - 2026" }],
      raw,
      characterCount: raw.length,
      estimatedPages: 1,
    });
    const issues = detectAtsIssues(parsed, raw);
    expect(issues.some((i) => i.severity === "medium" && /tabs/i.test(i.message))).toBe(true);
  });
});

describe("detectAtsIssues — low signals", () => {
  test("no portfolio/LinkedIn link surfaces a LOW issue", () => {
    const parsed = emptyParsed({
      contact: { name: null, email: "j@x.com", phone: "555-555-5555", location: null, links: [] },
      experience: [
        { role: "R", company: "C", dates: "May 2024 — Aug 2024", bullets: ["Shipped."] },
      ],
      skills: ["Python"],
      education: [{ school: "CMU", degree: "BS CS", dates: "2022 - 2026" }],
      estimatedPages: 1,
    });
    const issues = detectAtsIssues(parsed, "x");
    expect(issues.some((i) => i.severity === "low" && /portfolio|linkedin/i.test(i.message))).toBe(true);
  });

  test("very short resume surfaces a LOW issue", () => {
    const raw = "Jane Doe j@x.com";
    const parsed = emptyParsed({
      contact: { name: "Jane Doe", email: "j@x.com", phone: "555-555-5555", location: null, links: [{ label: "LinkedIn", url: "https://linkedin.com/in/x" }] },
      experience: [
        { role: "R", company: "C", dates: "May 2024 — Aug 2024", bullets: ["Shipped."] },
      ],
      skills: ["Python"],
      education: [{ school: "CMU", degree: "BS CS", dates: "2022 - 2026" }],
      raw,
      characterCount: raw.length,
      estimatedPages: 0.1,
    });
    const issues = detectAtsIssues(parsed, raw);
    expect(issues.some((i) => i.severity === "low" && /short/i.test(i.message))).toBe(true);
  });
});

describe("detectAtsIssues — sorting & robustness", () => {
  test("issues sorted critical > high > medium > low", () => {
    const issues = detectAtsIssues(emptyParsed(), "");
    const ranks = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    for (let i = 1; i < issues.length; i++) {
      expect(ranks[issues[i].severity]).toBeGreaterThanOrEqual(ranks[issues[i - 1].severity]);
    }
  });

  test("empty parse + raw produces many issues without crashing", () => {
    const issues = detectAtsIssues(emptyParsed(), "");
    expect(issues.length).toBeGreaterThan(3);
    expect(() => detectAtsIssues(emptyParsed(), "")).not.toThrow();
  });

  test("end-to-end with parseAts: clean resume produces fewer issues than empty", () => {
    const cleanText = `Jane Doe
San Francisco, CA
jane.doe@example.com | (415) 555-0142
linkedin.com/in/janedoe

SUMMARY
Backend engineering intern focused on distributed systems and reliability work.

EXPERIENCE
Software Engineering Intern — Stripe
May 2024 — Aug 2024
• Built a deduplication pipeline that cut duplicate webhook deliveries by 38%.
• Shipped a cache warmer that reduced P95 latency from 320ms to 90ms.

SKILLS
Python, Go, TypeScript, Postgres, Redis, gRPC, Kubernetes, AWS

EDUCATION
Carnegie Mellon University
B.S. Computer Science
Aug 2022 — May 2026
`;
    const parsed = parseAts(cleanText);
    const issues = detectAtsIssues(parsed, cleanText);
    const empty = detectAtsIssues(emptyParsed(), "");
    expect(issues.length).toBeLessThan(empty.length);
  });
});
