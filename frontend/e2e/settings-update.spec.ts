import { test, expect } from "@playwright/test";

/**
 * Settings -> profile form interactivity.
 *
 * Pre-condition: demo mode active. Without Supabase configured, apiPatch
 * routes through handleDemoPatch which resolves successfully — so the
 * sonner toast appears and aria-busy briefly flips. The point of the test
 * is to catch regressions where the form stops being interactive (label
 * htmlFor pairing breaks, the submit handler stops firing, the submit
 * button never renders, etc.).
 *
 * We deliberately do NOT assert that the values persist across reload:
 * demo writes live in module-scope memory which is per-page-load anyway.
 */

const DEMO_FLAG_KEY = "autoappli_demo_mode";
const TEST_DISPLAY_NAME = "E2E Test User";
const TEST_PHONE = "(555) 010-0000";

test("settings profile form accepts edits and submits without freezing", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => {
    window.localStorage.clear();
    window.localStorage.setItem(key, "1");
  }, DEMO_FLAG_KEY);

  await page.goto("/settings");

  // Sanity: settings mounted.
  await expect(
    page.getByRole("heading", { level: 1, name: /settings/i }),
  ).toBeVisible();

  // The Profile card has a <form aria-busy={savingProfile}> wrapping the
  // fields. We grab it via the Save button so we can assert aria-busy on
  // the closest form ancestor before/after submit.
  const saveBtn = page.getByRole("button", { name: /save profile/i }).first();

  // Display name + Phone are htmlFor-paired Label/Input pairs, so getByLabel
  // resolves them. .first() is defensive — there's only one match today,
  // but keeps the test robust if the layout duplicates fields later.
  const displayName = page.getByLabel(/display name/i).first();
  await expect(displayName).toBeVisible();
  await displayName.fill(TEST_DISPLAY_NAME);
  await expect(displayName).toHaveValue(TEST_DISPLAY_NAME);

  const phone = page.getByLabel(/^phone$/i).first();
  await phone.fill(TEST_PHONE);
  await expect(phone).toHaveValue(TEST_PHONE);

  // Submit. In demo mode the patch resolves and the success toast renders.
  // We don't race aria-busy=true (it can flip back before the assertion
  // lands) — instead we assert the success signal: either the sonner toast
  // OR aria-busy returning to false after settle.
  await saveBtn.click();

  // Sonner success toast — the demo persistToast string is "Profile saved
  // for this browser session (demo)". Match loosely on "saved" so the test
  // survives copy tweaks and the supabase-direct path ("saved to your
  // account") if a future run has Supabase env vars present.
  const toast = page.getByText(/profile saved/i).first();
  await expect(toast).toBeVisible({ timeout: 5_000 });

  // After the patch resolves, aria-busy must be back to false. We pick the
  // form via the save button's closest <form>.
  const form = saveBtn.locator("xpath=ancestor::form[1]");
  await expect(form).toHaveAttribute("aria-busy", "false");
});
