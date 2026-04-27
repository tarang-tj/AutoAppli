/**
 * Tests for star-split utility — STAR heuristic decomposition + encode/decode.
 *
 * Covers:
 *   1. starSplit: < 4 sentences → dumps everything into action.
 *   2. starSplit: >= 4 sentences → correct S/T/A/R allocation.
 *   3. starSplit: title truncated to 80 chars with ellipsis.
 *   4. encodeImportPayload + decodeImportPayload round-trip.
 *   5. decodeImportPayload: returns null for garbage input (no throw).
 *   6. decodeImportPayload: returns null for structurally invalid JSON.
 */

import { describe, it, expect } from "vitest";
import {
  starSplit,
  encodeImportPayload,
  decodeImportPayload,
  type StarPayload,
} from "./star-split";

// ── starSplit ─────────────────────────────────────────────────────────────────

describe("starSplit", () => {
  it("dumps everything into action when fewer than 4 sentences", () => {
    const answer = "I fixed the bug. It worked great.";
    const result = starSplit("What did you do?", answer);
    expect(result.situation).toBe("");
    expect(result.task).toBe("");
    expect(result.action).toBe(answer.trim());
    expect(result.result).toBe("");
  });

  it("splits correctly with exactly 4 sentences", () => {
    const s = "The production system was down.";
    const t = "I was asked to diagnose the outage.";
    const a = "I traced the logs and found a memory leak.";
    const r = "We restored service in under an hour.";
    const answer = `${s} ${t} ${a} ${r}`;
    const result = starSplit("Describe a crisis.", answer);
    expect(result.situation).toBe(s);
    expect(result.task).toBe(t);
    expect(result.action).toBe(a);
    expect(result.result).toBe(r);
  });

  it("middle sentences all go into action when >= 5 sentences", () => {
    const sentences = [
      "We had a tight deadline.",
      "My job was to redesign the API.",
      "I drafted a spec.",
      "I implemented the changes.",
      "The API shipped on time.",
    ];
    const answer = sentences.join(" ");
    const result = starSplit("Describe a deadline.", answer);
    expect(result.situation).toBe(sentences[0]);
    expect(result.task).toBe(sentences[1]);
    // sentences 2 and 3 (indices 2..3) are action
    expect(result.action).toBe(`${sentences[2]} ${sentences[3]}`);
    expect(result.result).toBe(sentences[4]);
  });

  it("truncates a long question to 80 chars (79 content + ellipsis) as title", () => {
    const longQ = "A".repeat(90);
    const result = starSplit(longQ, "Short answer only one sentence.");
    // "…" is 1 char; total = 79 slice + 1 ellipsis = 80
    expect(result.title).toHaveLength(80);
    expect(result.title.endsWith("…")).toBe(true);
  });

  it("uses question verbatim when <= 80 chars", () => {
    const q = "Tell me about a challenge you overcame.";
    const result = starSplit(q, "Short.");
    expect(result.title).toBe(q);
  });

  it("returns empty tags array", () => {
    const result = starSplit("Q?", "A.");
    expect(result.tags).toEqual([]);
  });
});

// ── encode / decode round-trip ────────────────────────────────────────────────

describe("encodeImportPayload + decodeImportPayload", () => {
  const sample: StarPayload = {
    title: "Led a cross-functional sprint",
    situation: "Our team was behind schedule.",
    task: "I had to coordinate three engineers.",
    action: "I set up daily standups and tracked blockers in a shared doc.",
    result: "We shipped on time with zero regressions.",
    tags: [],
  };

  it("round-trips a StarPayload without data loss", () => {
    const encoded = encodeImportPayload(sample);
    expect(encoded).not.toBeNull();
    const decoded = decodeImportPayload(encoded!);
    expect(decoded).toEqual(sample);
  });

  it("returns null for empty string input", () => {
    expect(decodeImportPayload("")).toBeNull();
  });

  it("returns null for non-base64 garbage", () => {
    expect(decodeImportPayload("not-valid-base64!!!")).toBeNull();
  });

  it("returns null for valid base64 that decodes to non-StarPayload JSON", () => {
    // base64 of '{"foo":"bar"}' — valid JSON but wrong shape
    const b64 = btoa('{"foo":"bar"}');
    expect(decodeImportPayload(b64)).toBeNull();
  });

  it("returns null for valid base64 that decodes to a non-JSON string", () => {
    const b64 = btoa("hello world");
    expect(decodeImportPayload(b64)).toBeNull();
  });

  it("encoded payload is a non-empty string", () => {
    const encoded = encodeImportPayload(sample);
    expect(typeof encoded).toBe("string");
    expect((encoded ?? "").length).toBeGreaterThan(10);
  });
});
