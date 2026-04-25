/**
 * Tests for the iCal calendar link helpers.
 *
 * Run with `npx vitest run src/lib/__tests__/ical-link`.
 */
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  getDeadlinesDownloadUrl,
  getDeadlinesWebcalUrl,
} from "@/lib/ical-link";

const ENV_KEYS = ["NEXT_PUBLIC_SITE_URL", "VERCEL_URL"] as const;

describe("getDeadlinesDownloadUrl", () => {
  test("returns the relative API path", () => {
    expect(getDeadlinesDownloadUrl()).toBe("/api/v1/export/deadlines.ics");
  });

  test("is stable across calls (no env reads)", () => {
    const a = getDeadlinesDownloadUrl();
    const b = getDeadlinesDownloadUrl();
    expect(a).toBe(b);
  });
});

describe("getDeadlinesWebcalUrl", () => {
  // Snapshot/restore env so each test runs in isolation.
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = saved[k];
      }
    }
  });

  test("uses webcal:// protocol", () => {
    const url = getDeadlinesWebcalUrl();
    expect(url.startsWith("webcal://")).toBe(true);
  });

  test("includes the deadlines endpoint path", () => {
    const url = getDeadlinesWebcalUrl();
    expect(url.endsWith("/api/v1/export/deadlines.ics")).toBe(true);
  });

  test("falls back to localhost when no site URL is set", () => {
    expect(getDeadlinesWebcalUrl()).toBe(
      "webcal://localhost:3000/api/v1/export/deadlines.ics",
    );
  });

  test("strips https:// from explicit NEXT_PUBLIC_SITE_URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://autoappli.app";
    expect(getDeadlinesWebcalUrl()).toBe(
      "webcal://autoappli.app/api/v1/export/deadlines.ics",
    );
  });

  test("strips trailing slash from site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://autoappli.app/";
    expect(getDeadlinesWebcalUrl()).toBe(
      "webcal://autoappli.app/api/v1/export/deadlines.ics",
    );
  });

  test("uses VERCEL_URL when explicit site URL is unset", () => {
    process.env.VERCEL_URL = "preview-abc.vercel.app";
    expect(getDeadlinesWebcalUrl()).toBe(
      "webcal://preview-abc.vercel.app/api/v1/export/deadlines.ics",
    );
  });
});
