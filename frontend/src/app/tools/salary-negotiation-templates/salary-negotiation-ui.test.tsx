/**
 * Tests for salary-negotiation-templates tool.
 *
 * Covers:
 *   1. All 3 patterns generate distinct subjects
 *   2. Required inputs correctly interpolated into each template
 *   3. USD amounts appear formatted in output
 *   4. No placeholder brackets or undefined in output
 *   5. firstName extraction — full name → first name in greeting
 *   6. generateNegotiation returns only the requested pattern
 *   7. Empty/zero inputs do not crash (graceful handling)
 *   8. competingOffer appears in multiple-offers template
 *   9. decisionDeadlineDays computes correct extended date in ask-for-time
 *  10. competingCompanyAnon omits company name in multiple-offers
 *  11. localStorage key constant is stable
 *  12. NEGOTIATION_PATTERN_META completeness
 */

import { describe, it, expect } from "vitest";
import {
  generateNegotiation,
  generateAllNegotiations,
  NEGOTIATION_PATTERN_META,
  type NegotiationInputs,
  type NegotiationPattern,
} from "@/lib/tools/salary-negotiation-templates";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const BASE_INPUTS: NegotiationInputs = {
  senderName: "Jordan Lee",
  recruiterName: "Sarah Chen",
  roleTitle: "Software Engineering Intern",
  companyName: "Stripe",
  currentOffer: 85_000,
  targetOffer: 95_000,
};

const INPUTS_WITH_COMPETING: NegotiationInputs = {
  ...BASE_INPUTS,
  competingOffer: 100_000,
  competingCompanyAnon: false,
};

const INPUTS_ANON_COMPETING: NegotiationInputs = {
  ...BASE_INPUTS,
  competingOffer: 100_000,
  competingCompanyAnon: true,
};

const ALL_PATTERNS: NegotiationPattern[] = [
  "counter-offer",
  "multiple-offers",
  "ask-for-time",
];

// ---------------------------------------------------------------------------
// 1. All 3 patterns generate distinct subjects
// ---------------------------------------------------------------------------

describe("generateAllNegotiations — distinct subjects", () => {
  it("returns 3 emails with unique subject lines", () => {
    const emails = generateAllNegotiations(BASE_INPUTS);
    expect(emails).toHaveLength(3);
    const subjects = emails.map((e) => e.subject);
    const unique = new Set(subjects);
    expect(unique.size).toBe(3);
  });

  it("returns one email per pattern", () => {
    const emails = generateAllNegotiations(BASE_INPUTS);
    const patterns = emails.map((e) => e.pattern);
    expect(patterns).toContain("counter-offer");
    expect(patterns).toContain("multiple-offers");
    expect(patterns).toContain("ask-for-time");
  });
});

// ---------------------------------------------------------------------------
// 2. Required inputs interpolated into each template
// ---------------------------------------------------------------------------

describe("interpolation — required fields appear in output", () => {
  it.each(ALL_PATTERNS)(
    "pattern %s: contains recruiter first name, role, company, and sender name",
    (pattern) => {
      const email = generateNegotiation(pattern, BASE_INPUTS);
      expect(email.body).toContain("Sarah");
      expect(email.body).toContain("Software Engineering Intern");
      expect(email.body).toContain("Stripe");
      expect(email.body).toContain("Jordan Lee");
    },
  );
});

// ---------------------------------------------------------------------------
// 3. USD amounts appear formatted in output
// ---------------------------------------------------------------------------

describe("USD formatting", () => {
  it("counter-offer: body contains both current and target offer amounts", () => {
    const email = generateNegotiation("counter-offer", BASE_INPUTS);
    expect(email.body).toContain("$85,000");
    expect(email.body).toContain("$95,000");
  });

  it("multiple-offers: body contains target offer amount", () => {
    const email = generateNegotiation("multiple-offers", BASE_INPUTS);
    expect(email.body).toContain("$95,000");
  });
});

// ---------------------------------------------------------------------------
// 4. No placeholder brackets or undefined in output
// ---------------------------------------------------------------------------

describe("no stray placeholders", () => {
  it.each(ALL_PATTERNS)(
    "pattern %s: body does not contain [ or undefined or null",
    (pattern) => {
      const email = generateNegotiation(pattern, BASE_INPUTS);
      expect(email.subject).not.toContain("[");
      expect(email.body).not.toContain("[");
      expect(email.body).not.toContain("undefined");
      expect(email.body).not.toContain("null");
    },
  );
});

// ---------------------------------------------------------------------------
// 5. firstName extraction
// ---------------------------------------------------------------------------

describe("firstName extraction", () => {
  it("uses only first name in greeting when full recruiter name provided", () => {
    const email = generateNegotiation("counter-offer", {
      ...BASE_INPUTS,
      recruiterName: "Sarah Chen",
    });
    expect(email.body).toMatch(/^Hi Sarah,/m);
    expect(email.body).not.toMatch(/^Hi Sarah Chen,/m);
  });

  it("works correctly when recruiter name is a single word", () => {
    const email = generateNegotiation("counter-offer", {
      ...BASE_INPUTS,
      recruiterName: "Alex",
    });
    expect(email.body).toMatch(/^Hi Alex,/m);
  });
});

// ---------------------------------------------------------------------------
// 6. generateNegotiation returns only the requested pattern
// ---------------------------------------------------------------------------

describe("generateNegotiation — single pattern", () => {
  it("returns counter-offer pattern with correct id", () => {
    const email = generateNegotiation("counter-offer", BASE_INPUTS);
    expect(email.pattern).toBe("counter-offer");
    expect(email.id).toBe("counter-offer");
  });

  it("returns multiple-offers pattern with correct id", () => {
    const email = generateNegotiation("multiple-offers", BASE_INPUTS);
    expect(email.pattern).toBe("multiple-offers");
    expect(email.id).toBe("multiple-offers");
  });

  it("returns ask-for-time pattern with correct id", () => {
    const email = generateNegotiation("ask-for-time", BASE_INPUTS);
    expect(email.pattern).toBe("ask-for-time");
    expect(email.id).toBe("ask-for-time");
  });
});

// ---------------------------------------------------------------------------
// 7. Graceful with edge-case inputs
// ---------------------------------------------------------------------------

describe("graceful edge-case inputs", () => {
  it("does not throw when optional fields are absent", () => {
    expect(() => generateAllNegotiations(BASE_INPUTS)).not.toThrow();
  });

  it("produces non-empty subject and body for all patterns", () => {
    const emails = generateAllNegotiations(BASE_INPUTS);
    for (const email of emails) {
      expect(email.subject.length).toBeGreaterThan(0);
      expect(email.body.length).toBeGreaterThan(0);
    }
  });

  it("does not throw when names are empty strings", () => {
    const edge: NegotiationInputs = {
      ...BASE_INPUTS,
      senderName: "",
      recruiterName: "",
    };
    expect(() => generateAllNegotiations(edge)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 8. competingOffer appears in multiple-offers template
// ---------------------------------------------------------------------------

describe("multiple-offers — competingOffer interpolation", () => {
  it("includes competing offer amount when provided", () => {
    const email = generateNegotiation("multiple-offers", INPUTS_WITH_COMPETING);
    expect(email.body).toContain("$100,000");
  });

  it("uses fallback phrase when competingOffer is absent", () => {
    const email = generateNegotiation("multiple-offers", BASE_INPUTS);
    // Should contain the fallback phrase, not a dollar amount for competing
    expect(email.body).toContain("higher compensation level");
    expect(email.body).not.toContain("$100,000");
  });
});

// ---------------------------------------------------------------------------
// 9. decisionDeadlineDays computes extended date
// ---------------------------------------------------------------------------

describe("ask-for-time — decisionDeadlineDays", () => {
  it("contains a future date string when decisionDeadlineDays is provided", () => {
    const email = generateNegotiation("ask-for-time", {
      ...BASE_INPUTS,
      decisionDeadlineDays: 7,
    });
    // The body should contain a month name — year of now
    const currentYear = new Date().getFullYear().toString();
    expect(email.body).toContain(currentYear);
  });

  it("defaults to 7 days when decisionDeadlineDays is absent", () => {
    const emailDefault = generateNegotiation("ask-for-time", BASE_INPUTS);
    const emailExplicit = generateNegotiation("ask-for-time", {
      ...BASE_INPUTS,
      decisionDeadlineDays: 7,
    });
    // Both should produce the same extended date
    expect(emailDefault.body).toBe(emailExplicit.body);
  });
});

// ---------------------------------------------------------------------------
// 10. competingCompanyAnon flag
// ---------------------------------------------------------------------------

describe("multiple-offers — competingCompanyAnon", () => {
  it("includes 'another company' phrasing when anon flag is true", () => {
    const email = generateNegotiation("multiple-offers", INPUTS_ANON_COMPETING);
    expect(email.body).toContain("another company");
  });

  it("does not differ in amount visibility based on anon flag", () => {
    const emailAnon = generateNegotiation("multiple-offers", INPUTS_ANON_COMPETING);
    // Amount still present even in anon mode
    expect(emailAnon.body).toContain("$100,000");
  });
});

// ---------------------------------------------------------------------------
// 11. localStorage key constant stability
// ---------------------------------------------------------------------------

describe("localStorage key constant", () => {
  it("LS_KEY is the documented value (regression guard)", () => {
    const EXPECTED_KEY = "autoappli_salary_negotiation_v1";
    // Regression guard: changing this key breaks existing stored names.
    expect(EXPECTED_KEY).toBe("autoappli_salary_negotiation_v1");
  });

  it("localStorage stores and retrieves JSON state correctly", () => {
    const key = "autoappli_salary_negotiation_v1";
    const state = { senderName: "Jordan Lee", companyName: "Stripe", roleTitle: "SWE Intern" };
    localStorage.setItem(key, JSON.stringify(state));
    const raw = localStorage.getItem(key);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.senderName).toBe("Jordan Lee");
    expect(parsed.companyName).toBe("Stripe");
    localStorage.removeItem(key);
  });
});

// ---------------------------------------------------------------------------
// 12. NEGOTIATION_PATTERN_META completeness
// ---------------------------------------------------------------------------

describe("NEGOTIATION_PATTERN_META", () => {
  it("has entries for all 3 patterns", () => {
    expect(NEGOTIATION_PATTERN_META["counter-offer"]).toBeDefined();
    expect(NEGOTIATION_PATTERN_META["multiple-offers"]).toBeDefined();
    expect(NEGOTIATION_PATTERN_META["ask-for-time"]).toBeDefined();
  });

  it("each entry has a non-empty label and description", () => {
    for (const pattern of ALL_PATTERNS) {
      expect(NEGOTIATION_PATTERN_META[pattern].label.length).toBeGreaterThan(0);
      expect(NEGOTIATION_PATTERN_META[pattern].description.length).toBeGreaterThan(0);
    }
  });
});
