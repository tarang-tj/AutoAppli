/**
 * Unit tests for the onboarding state machine.
 *
 * jsdom gives us a real `window.localStorage` — we wipe both keys before
 * each test so cases don't bleed into each other.
 */
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  SEEN_KEY,
  STEP_KEY,
  markSeen,
  readOnboardingState,
  resetOnboarding,
  writeStep,
} from "../onboarding-state";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("readOnboardingState", () => {
  test("returns defaults when nothing is in localStorage", () => {
    expect(readOnboardingState()).toEqual({ step: 1, seen: false });
  });

  test("returns the persisted step when one is set", () => {
    window.localStorage.setItem(STEP_KEY, "3");
    expect(readOnboardingState()).toEqual({ step: 3, seen: false });
  });

  test("returns step: 'done' when seen=true regardless of step value", () => {
    window.localStorage.setItem(STEP_KEY, "2");
    window.localStorage.setItem(SEEN_KEY, "1");
    expect(readOnboardingState()).toEqual({ step: "done", seen: true });
  });

  test("falls back to step 1 if STEP_KEY holds garbage", () => {
    window.localStorage.setItem(STEP_KEY, "banana");
    expect(readOnboardingState()).toEqual({ step: 1, seen: false });
  });
});

describe("writeStep", () => {
  test("persists the step to localStorage", () => {
    writeStep(2);
    expect(window.localStorage.getItem(STEP_KEY)).toBe("2");
    expect(readOnboardingState().step).toBe(2);
  });

  test("writeStep('done') marks the tour seen instead of writing a step", () => {
    writeStep("done");
    expect(window.localStorage.getItem(SEEN_KEY)).toBe("1");
    expect(readOnboardingState()).toEqual({ step: "done", seen: true });
  });
});

describe("markSeen", () => {
  test("sets the seen flag to '1'", () => {
    markSeen();
    expect(window.localStorage.getItem(SEEN_KEY)).toBe("1");
    expect(readOnboardingState().seen).toBe(true);
  });
});

describe("resetOnboarding", () => {
  test("clears both keys so the tour fires fresh next visit", () => {
    writeStep(3);
    markSeen();
    expect(window.localStorage.getItem(STEP_KEY)).toBe("3");
    expect(window.localStorage.getItem(SEEN_KEY)).toBe("1");

    resetOnboarding();

    expect(window.localStorage.getItem(STEP_KEY)).toBeNull();
    expect(window.localStorage.getItem(SEEN_KEY)).toBeNull();
    expect(readOnboardingState()).toEqual({ step: 1, seen: false });
  });
});
