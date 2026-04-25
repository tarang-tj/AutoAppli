/**
 * Unit tests for the ATS resume parser.
 *
 * Pure-logic only. Run with `npx vitest run src/lib/tools`.
 */

import { describe, expect, test } from "vitest";
import { parseAts } from "../ats-parse";

const STANDARD_RESUME = `Jane Doe
San Francisco, CA
jane.doe@example.com | (415) 555-0142
linkedin.com/in/janedoe | github.com/janedoe

SUMMARY
Junior software engineer with two internships in distributed systems and a focus on infra reliability. Looking for new-grad backend roles starting Summer 2026.

EXPERIENCE
Software Engineering Intern — Stripe
May 2024 - Aug 2024
• Built a deduplication pipeline that cut duplicate webhook deliveries by 38%.
• Shipped a cache warmer for the payments dashboard, reducing P95 from 320ms to 90ms.

Software Engineering Intern — Cloudflare
May 2023 - Aug 2023
• Owned migration of 14 internal services from raw HTTP to gRPC.
• Reduced on-call paging volume by 22% via dashboard rewrites.

SKILLS
Python, Go, TypeScript, Rust, Postgres, Redis, gRPC, Kubernetes, AWS, Terraform

EDUCATION
Carnegie Mellon University
B.S. Computer Science, expected May 2026
Aug 2022 - May 2026

PROJECTS
ats-view — Resume parser that mirrors what ATS systems extract.
spotmail — Static-site analytics shipped on Cloudflare Workers.
`;

describe("parseAts — empty input", () => {
  test("returns empty parsed shape for empty string", () => {
    const r = parseAts("");
    expect(r.contact.name).toBeNull();
    expect(r.contact.email).toBeNull();
    expect(r.contact.phone).toBeNull();
    expect(r.contact.links).toEqual([]);
    expect(r.summary).toBeNull();
    expect(r.experience).toEqual([]);
    expect(r.skills).toEqual([]);
    expect(r.education).toEqual([]);
    expect(r.projects).toEqual([]);
    expect(r.characterCount).toBe(0);
  });

  test("whitespace-only treated as empty", () => {
    const r = parseAts("   \n\t   \n");
    expect(r.contact.email).toBeNull();
    expect(r.experience).toEqual([]);
  });
});

describe("parseAts — standard resume", () => {
  const r = parseAts(STANDARD_RESUME);

  test("extracts name from first line", () => {
    expect(r.contact.name).toBe("Jane Doe");
  });

  test("extracts email anywhere in text", () => {
    expect(r.contact.email).toBe("jane.doe@example.com");
  });

  test("extracts phone", () => {
    expect(r.contact.phone).toContain("415");
  });

  test("extracts LinkedIn and GitHub links", () => {
    const labels = r.contact.links.map((l) => l.label);
    expect(labels).toContain("LinkedIn");
    expect(labels).toContain("GitHub");
  });

  test("extracts location", () => {
    expect(r.contact.location).toBe("San Francisco, CA");
  });

  test("extracts summary", () => {
    expect(r.summary).toBeTruthy();
    expect(r.summary).toMatch(/junior software engineer/i);
  });

  test("extracts multiple experience entries with bullets", () => {
    expect(r.experience.length).toBe(2);
    expect(r.experience[0].bullets.length).toBeGreaterThan(0);
    expect(r.experience[0].dates).toMatch(/2024/);
  });

  test("extracts a flat skills list", () => {
    expect(r.skills.length).toBeGreaterThanOrEqual(8);
    expect(r.skills).toContain("Python");
    expect(r.skills).toContain("TypeScript");
  });

  test("extracts education entries", () => {
    expect(r.education.length).toBeGreaterThan(0);
    expect(r.education[0].school.toLowerCase()).toContain("carnegie mellon");
  });

  test("extracts project entries", () => {
    expect(r.projects.length).toBeGreaterThanOrEqual(2);
    expect(r.projects[0].name.toLowerCase()).toContain("ats-view");
  });
});

describe("parseAts — edge cases", () => {
  test("email-only-in-header is still detected", () => {
    const r = parseAts("contact: only@example.com\n\nEXPERIENCE\nIntern at Acme 2024");
    expect(r.contact.email).toBe("only@example.com");
  });

  test("resume with no skills section returns empty skills", () => {
    const r = parseAts(`Jane Doe\njane@x.com\n\nEXPERIENCE\nIntern — Acme\nMay 2024 - Aug 2024\n• Did stuff.`);
    expect(r.skills).toEqual([]);
  });

  test("estimatedPages is computed from character count", () => {
    const text = "a".repeat(3600);
    const r = parseAts(text);
    expect(r.characterCount).toBe(3600);
    expect(r.estimatedPages).toBeCloseTo(2, 0);
  });

  test("multiple experience entries reflected in array length", () => {
    const text = `EXPERIENCE
Intern — A
May 2023 - Aug 2023
• Did A.

Intern — B
May 2024 - Aug 2024
• Did B.

Intern — C
May 2025 - Aug 2025
• Did C.`;
    const r = parseAts(text);
    expect(r.experience.length).toBe(3);
  });

  test("falls back to first paragraph as summary when no header", () => {
    const text = `Jane Doe
jane@x.com

A junior backend engineer focused on distributed-systems internships in payments and infra. Looking for new-grad roles in 2026.

EXPERIENCE
Intern — Acme
May 2024 - Aug 2024
• Shipped stuff.`;
    const r = parseAts(text);
    expect(r.summary).toBeTruthy();
    expect(r.summary?.toLowerCase()).toContain("junior backend engineer");
  });
});
