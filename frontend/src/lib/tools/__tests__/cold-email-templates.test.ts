/**
 * Unit tests for the cold-email template generator.
 *
 * Scope: pure logic only — no UI, no I/O.
 * Run with `npx vitest run src/lib/tools`.
 */

import { describe, expect, test } from "vitest";
import {
  generateColdEmails,
  type ColdEmailInputs,
} from "../cold-email-templates";

const BASE_INPUTS: ColdEmailInputs = {
  targetName: "Sarah Chen",
  targetCompany: "Stripe",
  yourName: "Jordan Lee",
  whyReachingOut:
    "I am a junior CS student at Georgia Tech interested in backend engineering. " +
    "I read Sarah's post on distributed tracing and it matched exactly what I have been building in my systems class.",
};

describe("generateColdEmails — shape", () => {
  test("returns exactly 3 templates", () => {
    const emails = generateColdEmails(BASE_INPUTS);
    expect(emails).toHaveLength(3);
  });

  test("each template has required fields", () => {
    const emails = generateColdEmails(BASE_INPUTS);
    for (const email of emails) {
      expect(email.id).toBeTruthy();
      expect(email.patternLabel).toBeTruthy();
      expect(email.patternDescription).toBeTruthy();
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.body.length).toBeGreaterThan(0);
    }
  });

  test("IDs are unique across templates", () => {
    const emails = generateColdEmails(BASE_INPUTS);
    const ids = emails.map((e) => e.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe("generateColdEmails — interpolation", () => {
  test("all templates reference the target company", () => {
    const emails = generateColdEmails(BASE_INPUTS);
    for (const email of emails) {
      const combined = `${email.subject} ${email.body}`;
      expect(combined).toContain("Stripe");
    }
  });

  test("all templates reference the sender name", () => {
    const emails = generateColdEmails(BASE_INPUTS);
    for (const email of emails) {
      const combined = `${email.subject} ${email.body}`;
      // At minimum the first name should appear somewhere
      expect(combined).toMatch(/Jordan/);
    }
  });

  test("all templates reference the recipient's first name in body", () => {
    const emails = generateColdEmails(BASE_INPUTS);
    for (const email of emails) {
      expect(email.body).toContain("Sarah");
    }
  });

  test("role area is inferred from 'backend engineering' context", () => {
    const emails = generateColdEmails(BASE_INPUTS);
    const combined = emails.map((e) => `${e.subject} ${e.body}`).join(" ");
    expect(combined).toMatch(/backend/i);
  });
});

describe("generateColdEmails — edge cases", () => {
  test("handles single-word names", () => {
    const inputs: ColdEmailInputs = {
      ...BASE_INPUTS,
      targetName: "Alex",
      yourName: "Sam",
    };
    const emails = generateColdEmails(inputs);
    expect(emails).toHaveLength(3);
    for (const email of emails) {
      expect(email.body).toContain("Alex");
    }
  });

  test("handles very short 'why' paragraph gracefully", () => {
    const inputs: ColdEmailInputs = {
      ...BASE_INPUTS,
      whyReachingOut: "I want to work there.",
    };
    const emails = generateColdEmails(inputs);
    expect(emails).toHaveLength(3);
    for (const email of emails) {
      expect(email.body.length).toBeGreaterThan(50);
    }
  });

  test("deterministic — same inputs produce same output", () => {
    const first = generateColdEmails(BASE_INPUTS);
    const second = generateColdEmails(BASE_INPUTS);
    expect(first.map((e) => e.subject)).toEqual(second.map((e) => e.subject));
    expect(first.map((e) => e.body)).toEqual(second.map((e) => e.body));
  });
});
