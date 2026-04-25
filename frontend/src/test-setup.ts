/**
 * Global test setup. Runs once before each test file.
 *
 *   - Adds jest-dom matchers (toBeInTheDocument, toHaveAttribute, ...).
 *   - Cleans up the rendered DOM between tests so queries don't leak.
 *
 * The /vitest subpath import auto-extends Vitest's expect — no manual
 * `expect.extend()` needed.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
