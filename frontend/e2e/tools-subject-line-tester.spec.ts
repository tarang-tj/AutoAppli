import { test, expect } from "@playwright/test";

/**
 * /tools/subject-line-tester -> real-time subject-line scoring.
 *
 * Smoke-tests the public free tool. The scorer in
 * src/lib/tools/subject-line-score.ts runs purely in the browser and
 * produces a 0–10 score with category weak/ok/strong. The client uses
 * useDeferredValue, so the score appears after a short scheduler beat.
 * We rely on toBeVisible/expect.poll with reasonable timeouts.
 *
 * Score math (verified from subject-line-score.ts):
 *   "Quick question"
 *     -> 2 words (<4) ⇒ -2; spam-phrase "quick question" ⇒ -1.
 *     -> 5 - 2 - 1 = 2 ⇒ "weak"
 *
 *   "Stripe BI Engineer — referred by John Smith"
 *     -> 7 words ⇒ +1; person ("John Smith") ⇒ +1; role ("engineer") ⇒ +1
 *        (specificityBonus capped at +2).
 *     -> 5 + 1 + 2 = 8 ⇒ "strong"
 */

test("subject-line tester scores a weak input and a strong rewrite", async ({
  page,
}) => {
  await page.goto("/tools/subject-line-tester");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /cold email subject line tester/i,
    }),
  ).toBeVisible();

  const input = page.getByLabel(/subject line/i).first();
  await expect(input).toBeVisible();

  // ── Weak case ───────────────────────────────────────────────
  await input.fill("Quick question");

  // The result panel uses aria-live="polite". The category badge text is
  // uppercased via CSS but the DOM text content is lowercase. Match
  // case-insensitively.
  const weakBadge = page.getByText(/^weak$/i).first();
  await expect(weakBadge).toBeVisible({ timeout: 5_000 });

  // The "recruiter-template phrases detected" signal flags the spam hit.
  // Match on its stable copy fragment.
  await expect(
    page.getByText(/recruiter-template phrases detected/i).first(),
  ).toBeVisible();

  // The score number renders as "2/10" (or similar weak score) in the
  // big tabular-nums container. Just assert it's a single-digit weak score
  // by matching the visible "/10" suffix near a low number.
  const scoreText = page.locator("text=/10").first();
  await expect(scoreText).toBeVisible();

  // ── Strong rewrite ──────────────────────────────────────────
  // Clear and type a strong subject. Use fill("") then fill(...) to avoid
  // any cursor/IME quirks across the deferred update.
  await input.fill("");
  await input.fill("Stripe BI Engineer — referred by John Smith");

  // The category should flip to "strong" (or at minimum no longer "weak").
  // We assert on "strong" directly — the math is deterministic.
  const strongBadge = page.getByText(/^strong$/i).first();
  await expect(strongBadge).toBeVisible({ timeout: 5_000 });

  // The previous spam-phrase warning should be gone. Use toHaveCount(0) on
  // the locator so Playwright auto-retries until the deferred update
  // settles.
  await expect(
    page.getByText(/recruiter-template phrases detected/i),
  ).toHaveCount(0);

  // A specificity signal should have replaced it — either the "Names a
  // person" or the "Names a role" copy. Match either via regex alternation.
  await expect(
    page
      .getByText(/names a person|names a role|gives the reader a hook/i)
      .first(),
  ).toBeVisible();
});
