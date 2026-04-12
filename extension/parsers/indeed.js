/**
 * Indeed job page parser.
 *
 * Indeed job detail pages:
 * - indeed.com/viewjob?jk={id}
 * - indeed.com/jobs?viewjob={id}
 */

export function canParse(url) {
  return url.hostname === "www.indeed.com" &&
    (url.pathname.includes("/viewjob") || url.searchParams.has("vjk") || url.searchParams.has("jk"));
}

export function parse(document, url) {
  const title =
    getText(document, "h1.jobsearch-JobInfoHeader-title") ||
    getText(document, "h1[data-testid='jobTitle']") ||
    getText(document, ".jobsearch-JobInfoHeader-title") ||
    getText(document, "h1");

  const company =
    getText(document, "[data-testid='inlineHeader-companyName'] a") ||
    getText(document, "[data-testid='inlineHeader-companyName']") ||
    getText(document, ".jobsearch-CompanyInfoWithoutHeaderImage a") ||
    getText(document, ".css-1saizt3.e1wnkr790");

  const location =
    getText(document, "[data-testid='job-location']") ||
    getText(document, "[data-testid='inlineHeader-companyLocation']") ||
    getText(document, ".jobsearch-JobInfoHeader-subtitle .css-6z8o9s");

  const descEl =
    document.querySelector("#jobDescriptionText") ||
    document.querySelector(".jobsearch-jobDescriptionText") ||
    document.querySelector("[data-testid='jobDescription']");
  const description = descEl ? descEl.innerText.trim() : null;

  const salary =
    getText(document, "#salaryInfoAndJobType .css-2iqe2o") ||
    getText(document, ".salary-snippet-container") ||
    getText(document, "[data-testid='attribute_snippet_testid']") ||
    null;

  return {
    title,
    company,
    location,
    description,
    salary,
    url: url.href.split("&")[0],
    source: "indeed",
  };
}

function getText(doc, selector) {
  const el = doc.querySelector(selector);
  return el ? el.innerText.trim() : null;
}
