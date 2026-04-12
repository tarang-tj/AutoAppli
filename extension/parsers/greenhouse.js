/**
 * Greenhouse job board parser.
 *
 * Greenhouse-hosted boards use a consistent structure:
 * - boards.greenhouse.io/{company}/jobs/{id}
 * - The HTML is server-rendered with predictable class names.
 */

export function canParse(url) {
  return url.hostname === "boards.greenhouse.io" && url.pathname.includes("/jobs/");
}

export function parse(document, url) {
  const title =
    getText(document, ".app-title") ||
    getText(document, "h1.heading") ||
    getText(document, "h1");

  // Company name is usually in the board header or page title
  const company =
    getText(document, ".company-name") ||
    extractCompanyFromUrl(url) ||
    getText(document, "title")?.split(" at ")?.[1]?.split(" - ")?.[0]?.trim() ||
    null;

  const location =
    getText(document, ".location") ||
    getText(document, ".body--metadata") ||
    null;

  // Description content
  const descEl =
    document.querySelector("#content .content-intro + div") ||
    document.querySelector("#content") ||
    document.querySelector(".job__description");
  const description = descEl ? descEl.innerText.trim() : null;

  return {
    title,
    company,
    location,
    description,
    salary: null,
    url: url.href.split("?")[0],
    source: "greenhouse",
  };
}

function getText(doc, selector) {
  const el = doc.querySelector(selector);
  return el ? el.innerText.trim() : null;
}

function extractCompanyFromUrl(url) {
  // boards.greenhouse.io/{company}/jobs/{id}
  const match = url.pathname.match(/^\/([^/]+)\/jobs\//);
  if (match) {
    return match[1]
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return null;
}
