import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for AutoAppli frontend E2E tests.
 *
 * - Runs against the Next.js dev server (`npm run dev`).
 * - Single chromium project to keep CI runs cheap.
 * - `fullyParallel: false` because the tests share one localhost dev server
 *   and they touch localStorage (demo-mode flag) — easier to keep them
 *   serial than to coordinate isolation.
 *
 * One-time setup before first run:
 *   npm install
 *   npm run e2e:install   # downloads the chromium binary
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
