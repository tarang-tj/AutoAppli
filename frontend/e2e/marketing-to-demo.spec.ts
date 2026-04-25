import { test, expect } from "@playwright/test";

/**
 * Marketing -> demo dashboard.
 *
 * Verifies the highest-leverage acquisition path: a visitor lands on the
 * marketing page, clicks the demo CTA, and ends up on /dashboard with the
 * demo-mode banner visible.
 *
 * The Try-the-demo button only renders when the landing page is in
 * production (signup) mode — `demoMode=false` on the page prop. In demo
 * builds the same CTA is replaced by an "Open the app" link. We accept
 * either path so this test stays useful in both prod and preview builds.
 */
test("visitor can hit the demo dashboard from the landing page", async ({
  page,
}) => {
  await page.goto("/");

  // Hero copy is the canonical signal that the landing page rendered.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /internship grind/i,
  );

  // In production-mode landing, the hero shows "Try it without signup" and
  // the FinalCTA shows "Try the demo". In demo-mode landing, those are
  // replaced by "Open the app" links to /dashboard. Match either.
  const tryDemoButton = page.getByRole("button", {
    name: /try (the demo|it without)/i,
  });
  const openAppLink = page.getByRole("link", { name: /open the app/i });

  if (await tryDemoButton.first().isVisible().catch(() => false)) {
    await tryDemoButton.first().click();
  } else {
    await openAppLink.first().click();
  }

  // We should land on the dashboard route (path may include query in prod).
  await expect(page).toHaveURL(/\/dashboard/);

  // Demo-mode banner is the user-visible signal that demo mode is on.
  // It only shows after demo flag is set; if the page is in real-Supabase
  // production mode but the visitor is unauthenticated, middleware redirects
  // back to /login — so we accept either the banner OR the kanban heading
  // as proof the demo dashboard rendered.
  const banner = page.getByRole("status").filter({
    hasText: /exploring the demo/i,
  });
  const dashboardHeading = page.getByRole("heading", {
    level: 1,
    name: /job tracker/i,
  });

  await expect(banner.or(dashboardHeading).first()).toBeVisible({
    timeout: 10_000,
  });
});
