/**
 * Workday job board parser.
 *
 * Workday is a multi-tenant platform. Job pages are hosted at tenant-specific
 * subdomains such as:
 *   - amazon.wd5.myworkdayjobs.com/en-US/External_Careers/job/...
 *   - company.workday.com/...
 *
 * Workday uses stable `data-automation-id` attributes across tenants,
 * making them reliable extraction targets.
 */

export function canParse(url) {
  return (
    url.hostname.endsWith(".workday.com") ||
    url.hostname.endsWith(".myworkdayjobs.com")
  );
}

export function parse(document, url) {
  // Title
  const title =
    getText(document, '[data-automation-id="jobPostingHeader"]') ||
    getText(document, 'h2[data-automation-id="jobPostingHeader"]') ||
    getText(document, "h1") ||
    null;

  // Company: derived from subdomain slug or page title
  const company = extractCompany(document, url);

  // Location
  const location =
    getText(document, '[data-automation-id="locations"] dd') ||
    getText(document, '[data-automation-id="job-posting-details"] [data-automation-id="locations"]') ||
    getText(document, '[data-automation-id="location"]') ||
    null;

  // Description
  const descEl =
    document.querySelector('[data-automation-id="jobPostingDescription"]') ||
    document.querySelector('[data-automation-id="job-posting-description"]');
  const description = descEl ? descEl.innerText.trim() || null : null;

  // Salary (not always present)
  const salary =
    getText(document, '[data-automation-id="compensation"] dd') ||
    getText(document, '[data-automation-id="pay"] dd') ||
    null;

  // Additional metadata surfaced when available
  const postedOn =
    getText(document, '[data-automation-id="postedOn"] dd') || null;
  const jobId =
    getText(document, '[data-automation-id="requisitionId"] dd') || null;

  return {
    title,
    company,
    location,
    description,
    salary,
    url: url.href.split("?")[0],
    source: "workday",
    postedOn,
    jobId,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function getText(doc, selector) {
  const el = doc.querySelector(selector);
  return el ? el.innerText.trim() : null;
}

function extractCompany(doc, url) {
  // Primary: first subdomain segment is the tenant slug
  // e.g. "amazon.wd5.myworkdayjobs.com" → parts[0] = "amazon"
  const parts = url.hostname.split(".");
  const slug = parts[0];
  if (slug && slug !== "www") {
    return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Fallback: page title is often "Job Title - Company Name" or "Company | Job Title"
  const pageTitle = doc.title || "";
  const dashIdx = pageTitle.lastIndexOf(" - ");
  if (dashIdx !== -1) {
    const candidate = pageTitle.substring(dashIdx + 3).trim();
    if (candidate.length > 0 && candidate.length < 80) return candidate;
  }
  const pipeIdx = pageTitle.indexOf(" | ");
  if (pipeIdx !== -1) {
    const candidate = pageTitle.substring(pipeIdx + 3).trim();
    if (candidate.length > 0 && candidate.length < 80) return candidate;
  }

  return null;
}
