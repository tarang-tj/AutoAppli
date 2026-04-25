import { test, expect } from "@playwright/test";

/**
 * /pricing -> public marketing page smoke test.
 *
 * No auth needed — this route is publicly indexable. Verifies the page
 * renders the H1, the free-tier callouts, the FAQ accordion (using native
 * <details>/<summary> so no JS required to expand), and the FinalCTA
 * button that links to /signup.
 *
 * The FAQ uses `<details>` not `<button>`. We expand by clicking the
 * <summary>, not by toggling aria-expanded.
 */

test("pricing page renders headline, free tier, FAQ, and CTA", async ({
  page,
}) => {
  await page.goto("/pricing");

  // H1 — copy is "Pricing — straight, no asterisks." We match either word.
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toBeVisible();
  await expect(h1).toContainText(/pricing|no asterisks/i);

  // Free-tier callouts come from the FREE_TODAY array. We pick a couple of
  // representative copy hooks so the test still passes if the list is
  // re-ordered or re-worded slightly.
  await expect(page.getByText(/resume tailoring/i).first()).toBeVisible();
  await expect(page.getByText(/cover letter/i).first()).toBeVisible();

  // FAQ uses native <details> elements. Each one is rendered as a
  // <details><summary>...</summary><dd>...</dd></details>. There are 4
  // entries in FAQ_ITEMS. We assert via summary count.
  const summaries = page.locator("details > summary");
  await expect(summaries).toHaveCount(4);

  // Expand the first FAQ. <details> opens on click of <summary>; the
  // sibling <dd> answer becomes visible.
  const firstSummary = summaries.first();
  const firstDetails = page.locator("details").first();

  await expect(firstDetails).not.toHaveAttribute("open", "");
  await firstSummary.click();
  // After click, the open attribute is present (its value is "" in HTML).
  await expect(firstDetails).toHaveAttribute("open", /.*/);
  // The answer copy is now in the visible accessibility tree. Match the
  // first answer's signature phrase ("auto-conversion" / "credit card").
  await expect(
    firstDetails.getByText(/auto-conversion|credit card/i).first(),
  ).toBeVisible();

  // Final CTA — "Start your board" appears twice on the page (FreeTier
  // and FinalCTA). Both link to /signup, so any match satisfies the
  // contract. We grab them via role=link to skip header buttons.
  const startBoard = page.getByRole("link", { name: /start your board/i });
  await expect(startBoard.first()).toBeVisible();
  await expect(startBoard.first()).toHaveAttribute("href", "/signup");
});
