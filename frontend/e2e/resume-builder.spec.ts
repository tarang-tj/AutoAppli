import { test, expect } from "@playwright/test";

/**
 * Resume Builder -> sample data + tailoring notes + button enabled-state.
 *
 * Pre-condition: demo mode active. The "Load sample (resumes + JD)" button
 * calls loadSampleResumesForBuilder(), which seeds an in-memory resume and
 * fills the JD textarea with SAMPLE_JOB_DESCRIPTION_FOR_BUILDER.
 *
 * This test deliberately does NOT click Generate. The generate path calls
 * /resumes/generate, which in real prod hits the FastAPI -> Anthropic
 * pipeline and needs an API key. Verifying the button enabled-state is the
 * cheap proxy for "the form is ready to submit".
 */

const DEMO_FLAG_KEY = "autoappli_demo_mode";

test("resume builder loads sample, accepts notes, enables Generate", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => {
    window.localStorage.setItem(key, "1");
  }, DEMO_FLAG_KEY);

  await page.goto("/resume");

  await expect(
    page.getByRole("heading", { level: 1, name: /resume builder/i }),
  ).toBeVisible();

  // Generate is disabled until both a resume is selected AND there's a JD.
  const generateBtn = page.getByRole("button", {
    name: /generate tailored resume/i,
  });
  await expect(generateBtn).toBeDisabled();

  // Click "Load sample (resumes + JD)" — seeds a demo resume and fills JD.
  await page.getByRole("button", { name: /load sample/i }).click();

  // JD textarea now has substantive content.
  const jdTextarea = page.getByRole("textbox", { name: /job description/i });
  await expect(jdTextarea).not.toHaveValue("");
  const jdValue = await jdTextarea.inputValue();
  expect(jdValue.length).toBeGreaterThan(100);

  // Generate button is now enabled (resume loaded + JD non-empty).
  await expect(generateBtn).toBeEnabled();

  // Tailoring notes textarea exists and accepts input. The label is
  // "Tailoring notes (optional)" rendered as a CardTitle (not a <label>),
  // so we identify the textarea by its placeholder copy.
  const notesTextarea = page.getByPlaceholder(
    /emphasize cloud experience/i,
  );
  await notesTextarea.fill("Emphasize Python.");
  await expect(notesTextarea).toHaveValue("Emphasize Python.");

  // Generate button still enabled after typing notes — sanity guard against
  // future regressions where the button state ties to notes.
  await expect(generateBtn).toBeEnabled();
});
