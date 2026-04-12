/**
 * Generic fallback parser for unknown job boards.
 *
 * Uses common patterns: og: meta tags, LD+JSON structured data,
 * and heuristic heading extraction to pull job info from any page.
 */

export function canParse() {
  return true; // fallback — always matches
}

export function parse(document, url) {
  // Try structured data first (JSON-LD)
  const ldJson = extractJsonLd(document);

  // Then try Open Graph / meta tags
  const ogTitle = getMeta(document, "og:title");
  const ogDesc = getMeta(document, "og:description");
  const ogSiteName = getMeta(document, "og:site_name");

  // Heuristic: first h1 is usually the job title
  const h1 = document.querySelector("h1")?.innerText?.trim() || null;

  const title = ldJson?.title || ogTitle || h1 || document.title.split("|")[0].trim();

  const company =
    ldJson?.hiringOrganization?.name ||
    ogSiteName ||
    extractCompanyFromTitle(document.title) ||
    null;

  const location =
    ldJson?.jobLocation?.address?.addressLocality ||
    getMeta(document, "geo.placename") ||
    null;

  // Description: prefer JSON-LD, then look for large text blocks
  let description = ldJson?.description || null;
  if (!description) {
    // Find the largest text block on the page (likely the JD)
    const candidates = document.querySelectorAll(
      "article, [class*='description'], [class*='job-detail'], [id*='description'], main"
    );
    let longest = "";
    candidates.forEach((el) => {
      const text = el.innerText.trim();
      if (text.length > longest.length) {
        longest = text;
      }
    });
    if (longest.length > 100) {
      description = longest;
    }
  }

  return {
    title,
    company,
    location,
    description: description ? description.substring(0, 60000) : null,
    salary: ldJson?.baseSalary?.value?.value || null,
    url: url.href,
    source: url.hostname.replace("www.", ""),
  };
}

function getMeta(doc, name) {
  const el =
    doc.querySelector(`meta[property="${name}"]`) ||
    doc.querySelector(`meta[name="${name}"]`);
  return el?.getAttribute("content")?.trim() || null;
}

function extractJsonLd(doc) {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      // Could be an array or single object
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "JobPosting") {
          return item;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractCompanyFromTitle(pageTitle) {
  // Common patterns: "Job Title at Company", "Job Title - Company"
  const atMatch = pageTitle.match(/\bat\s+(.+?)(?:\s*[-|]|$)/i);
  if (atMatch) return atMatch[1].trim();
  const dashMatch = pageTitle.match(/[-|]\s*(.+?)(?:\s*[-|]|$)/);
  if (dashMatch) return dashMatch[1].trim();
  return null;
}
