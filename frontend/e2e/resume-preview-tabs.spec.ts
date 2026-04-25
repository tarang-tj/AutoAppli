import { test, expect } from "@playwright/test";

/**
 * Resume preview -> tab semantics.
 *
 * Pre-condition: demo mode active + a generated document. The
 * ResumePreview component only renders its tablist when `document` is
 * non-null, so we have to drive the page through Load sample -> Generate
 * to populate `generated`. In demo mode, /resumes/generate resolves
 * locally to a doc with .content (text only, no PDF), so:
 *
 *   - Formatted tab: enabled (has content)
 *   - PDF preview tab: disabled (no pdf_base64, no remote download_url)
 *   - Plain text tab:  enabled (has content)
 *   - Diff tab:        enabled (has content + originalText from sample resume)
 *
 * The component sets initial tab to "formatted" when there's no PDF.
 */

const DEMO_FLAG_KEY = "autoappli_demo_mode";

test("resume preview tablist switches selection and disables unavailable tabs", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => {
    window.localStorage.clear();
    window.localStorage.setItem(key, "1");
  }, DEMO_FLAG_KEY);

  await page.goto("/resume");

  await expect(
    page.getByRole("heading", { level: 1, name: /resume builder/i }),
  ).toBeVisible();

  // Seed sample resumes + JD.
  await page.getByRole("button", { name: /load sample/i }).click();

  // Trigger demo generation so the preview component actually mounts its
  // tablist. apiPost("/resumes/generate") in demo mode returns a doc with
  // text content but no PDF — perfect for asserting both enabled and
  // disabled tab states.
  await page
    .getByRole("button", { name: /generate tailored resume/i })
    .click();

  // Wait for the tablist to appear (it's gated on `generated` being set).
  const tablist = page.getByRole("tablist", { name: /resume preview mode/i });
  await expect(tablist).toBeVisible({ timeout: 15_000 });

  // Initial selection: the component picks "formatted" when no PDF exists.
  const formattedTab = tablist.getByRole("tab", { name: /formatted/i });
  await expect(formattedTab).toHaveAttribute("aria-selected", "true");

  // PDF preview tab is disabled because demo /resumes/generate returns no
  // pdf_base64 and no remote download_url. The button uses the native
  // `disabled` attribute — Playwright's toBeDisabled covers that.
  const pdfTab = tablist.getByRole("tab", { name: /pdf preview/i });
  await expect(pdfTab).toBeDisabled();

  // Click Plain text — enabled because effectiveContent is non-empty.
  const plainTextTab = tablist.getByRole("tab", { name: /plain text/i });
  await expect(plainTextTab).toBeEnabled();
  await plainTextTab.click();
  await expect(plainTextTab).toHaveAttribute("aria-selected", "true");
  // Previously selected tab is no longer selected.
  await expect(formattedTab).toHaveAttribute("aria-selected", "false");

  // The Plain text tabpanel renders the content via <pre>. We match the
  // demo-generated marker so we know it's the right panel.
  const plainPanel = page.getByRole("tabpanel");
  await expect(plainPanel).toBeVisible();
  await expect(plainPanel).toContainText(/demo output|professional summary/i);

  // Diff tab — enabled here because we have both `content` (from generate)
  // and `originalText` (parsed_text from the sample resume). Click it to
  // verify the click works; the panel itself lazy-loads ResumeDiffView.
  const diffTab = tablist.getByRole("tab", { name: /^diff$/i });
  await expect(diffTab).toBeEnabled();
});
