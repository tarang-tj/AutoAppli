import { test, expect } from "@playwright/test";

/**
 * Dashboard -> add a job via the dialog.
 *
 * Pre-condition: demo mode active. Set the localStorage flag directly so
 * we don't depend on the marketing page in this test (keeps the test
 * self-contained — see e2e/marketing-to-demo.spec.ts for the funnel test).
 *
 * Flow:
 *   1. Set demo flag and navigate to /dashboard.
 *   2. Click "Add Job".
 *   3. Fill required fields (Company, Job Title) plus URL.
 *   4. Submit.
 *   5. Confirm dialog closes and the new card appears on the kanban.
 *
 * Demo-mode jobs are persisted to localStorage by lib/demo-data.ts, so the
 * card is expected to render synchronously after the SWR mutate.
 */

const DEMO_FLAG_KEY = "autoappli_demo_mode";
const ONBOARDING_SEEN_KEY = "autoappli_onboarding_seen";
const COMPANY = "Playwright Labs";
const TITLE = "E2E QA Engineer";
const URL = "https://playwrightlabs.example.com/jobs/qa";

test("can add a job through the dialog and see it on the kanban", async ({
  page,
}) => {
  // Activate demo mode before navigation so the dashboard reads it on first
  // paint. localStorage is host-scoped, so we have to be on the origin to
  // set it — visit a tiny page first, set the flag, then navigate.
  // Also mark the onboarding tour as already-seen — otherwise the modal
  // mounts on /dashboard and intercepts pointer events on every other
  // dashboard control (CI failure observed in run #30).
  await page.goto("/");
  await page.evaluate(
    ([demoKey, onboardingKey]) => {
      window.localStorage.setItem(demoKey, "1");
      window.localStorage.setItem(onboardingKey, "1");
    },
    [DEMO_FLAG_KEY, ONBOARDING_SEEN_KEY],
  );

  await page.goto("/dashboard");

  // Sanity: dashboard mounted.
  await expect(
    page.getByRole("heading", { level: 1, name: /job tracker/i }),
  ).toBeVisible();

  // Open the Add Job dialog. There can be two "Add Job" affordances on the
  // page (top-bar trigger and an empty-state button). `.first()` keeps us
  // robust either way.
  await page
    .getByRole("button", { name: /add job/i })
    .first()
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: /add new job/i }),
  ).toBeVisible();

  // Required fields.
  await dialog.getByLabel(/company \*/i).fill(COMPANY);
  await dialog.getByLabel(/job title \*/i).fill(TITLE);
  await dialog.getByLabel(/job posting url/i).fill(URL);

  // Submit. The submit button inside the form is also labelled "Add Job".
  await dialog.getByRole("button", { name: /^add job$/i }).click();

  // Dialog closes on success.
  await expect(dialog).toBeHidden({ timeout: 10_000 });

  // The new card should be on the board. We don't assert the column —
  // any new job lands in Bookmarked, but we want this assertion to survive
  // future column rules. Matching on title + company text is enough.
  await expect(page.getByText(TITLE).first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(COMPANY).first()).toBeVisible();
});
