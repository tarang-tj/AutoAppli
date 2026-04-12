/**
 * Lever job board parser.
 *
 * Lever-hosted boards:
 * - jobs.lever.co/{company}/{jobId}
 * - Clean, consistent HTML structure.
 */

export function canParse(url) {
  return url.hostname === "jobs.lever.co";
}

export function parse(document, url) {
  const title =
    getText(document, ".posting-headline h2") ||
    getText(document, "h2[data-qa='posting-name']") ||
    getText(document, "h2");

  const company =
    getText(document, ".posting-headline .sort-by-time") ||
    extractCompanyFromUrl(url) ||
    null;

  // Lever puts location, department, type in commitment/location/team divs
  const location =
    getText(document, ".posting-categories .sort-by-time.posting-category:first-child") ||
    getText(document, ".location") ||
    null;

  const commitment =
    getText(document, ".posting-categories .commitment") ||
    null;

  // Description sections
  const sections = document.querySelectorAll(".section.page-centered");
  let description = "";
  sections.forEach((sec) => {
    description += sec.innerText.trim() + "\n\n";
  });
  description = description.trim() || null;

  return {
    title,
    company,
    location: [location, commitment].filter(Boolean).join(" · "),
    description,
    salary: null,
    url: url.href.split("?")[0],
    source: "lever",
  };
}

function getText(doc, selector) {
  const el = doc.querySelector(selector);
  return el ? el.innerText.trim() : null;
}

function extractCompanyFromUrl(url) {
  // jobs.lever.co/{company}/{jobId}
  const match = url.pathname.match(/^\/([^/]+)\//);
  if (match) {
    return match[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}
