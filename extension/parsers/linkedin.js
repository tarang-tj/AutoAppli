/**
 * LinkedIn job page parser.
 *
 * LinkedIn renders job details in several different views:
 * - /jobs/view/{id} — full-page detail
 * - /jobs/search/?currentJobId={id} — split pane (list + detail)
 * - /jobs/collections/{id} — saved jobs detail
 *
 * The selectors below cover the common patterns across these views.
 */

export function canParse(url) {
  return url.hostname === "www.linkedin.com" && url.pathname.startsWith("/jobs");
}

export function parse(document, url) {
  // Title — multiple possible containers
  const title =
    getText(document, "h1.t-24.t-bold") ||
    getText(document, "h1.topcard__title") ||
    getText(document, ".job-details-jobs-unified-top-card__job-title h1") ||
    getText(document, "h1");

  // Company
  const company =
    getText(document, ".job-details-jobs-unified-top-card__company-name a") ||
    getText(document, "a.topcard__org-name-link") ||
    getText(document, ".job-details-jobs-unified-top-card__company-name") ||
    getText(document, ".topcard__flavor--black-link");

  // Location
  const location =
    getText(document, ".job-details-jobs-unified-top-card__bullet") ||
    getText(document, ".topcard__flavor--bullet") ||
    getText(document, "[class*='job-criteria'] span");

  // Description — the rich-text area
  const descEl =
    document.querySelector(".jobs-description__content .jobs-box__html-content") ||
    document.querySelector(".jobs-description-content__text") ||
    document.querySelector("#job-details") ||
    document.querySelector(".description__text");
  const description = descEl ? descEl.innerText.trim() : null;

  // Salary (LinkedIn sometimes shows it)
  const salary =
    getText(document, ".salary.compensation__salary") ||
    getText(document, ".job-details-jobs-unified-top-card__job-insight--highlight span") ||
    null;

  return {
    title,
    company,
    location,
    description,
    salary,
    url: cleanUrl(url),
    source: "linkedin",
  };
}

function getText(doc, selector) {
  const el = doc.querySelector(selector);
  return el ? el.innerText.trim() : null;
}

function cleanUrl(url) {
  // Strip tracking params, keep just the job view URL
  const match = url.pathname.match(/\/jobs\/view\/(\d+)/);
  if (match) {
    return `https://www.linkedin.com/jobs/view/${match[1]}/`;
  }
  return url.href.split("?")[0];
}
