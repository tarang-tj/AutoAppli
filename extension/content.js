/**
 * AutoAppli Content Script
 *
 * Runs on job board pages. Extracts job details from the DOM using
 * site-specific parsers and sends the data to the popup/background
 * via chrome.runtime messaging.
 *
 * NOTE: Content scripts can't use ES module imports, so parsers are
 * inlined here via the build step or duplicated. For the initial
 * version we keep everything in one file for simplicity.
 */

(() => {
  "use strict";

  // ── Parser registry ──────────────────────────────────────────────────

  const parsers = [
    { name: "linkedin", canParse: canParseLinkedIn, parse: parseLinkedIn },
    { name: "greenhouse", canParse: canParseGreenhouse, parse: parseGreenhouse },
    { name: "lever", canParse: canParseLever, parse: parseLever },
    { name: "indeed", canParse: canParseIndeed, parse: parseIndeed },
    { name: "generic", canParse: () => true, parse: parseGeneric },
  ];

  function getText(selector) {
    const el = document.querySelector(selector);
    return el ? el.innerText.trim() : null;
  }

  // ── LinkedIn ─────────────────────────────────────────────────────────

  function canParseLinkedIn(url) {
    return url.hostname === "www.linkedin.com" && url.pathname.startsWith("/jobs");
  }

  function parseLinkedIn(url) {
    // LinkedIn's React app uses various class names across different views.
    // We try multiple strategies: direct selectors, artdeco lockup components,
    // and page-title parsing as a reliable fallback.

    // Strategy 1: Direct DOM selectors (classic + newer layouts)
    let title =
      getText("h1.t-24.t-bold") ||
      getText(".job-details-jobs-unified-top-card__job-title h1") ||
      getText("h1.topcard__title") ||
      getText(".artdeco-entity-lockup__title") ||
      getText("h1");

    // Clean up doubled title text (LinkedIn sometimes renders it twice)
    if (title && /^(.+)\n\1$/.test(title)) {
      title = title.split("\n")[0].trim();
    }

    // Strategy 1: Direct selectors for company
    let company =
      getText(".job-details-jobs-unified-top-card__company-name a") ||
      getText(".job-details-jobs-unified-top-card__company-name") ||
      getText("a.topcard__org-name-link") ||
      getText(".artdeco-entity-lockup__subtitle") ||
      getText(".topcard__flavor--black-link");

    // Strategy 2: Page title fallback — LinkedIn formats as "Title at Company | LinkedIn"
    if (!company || !title) {
      const pageTitle = document.title || "";
      const atMatch = pageTitle.match(/^(.+?)\s+at\s+(.+?)(?:\s*\||\s*[-–—]|\s*$)/i);
      if (atMatch) {
        if (!title) title = atMatch[1].trim();
        if (!company) company = atMatch[2].trim();
      }
      // Sometimes title is just "Job Title | LinkedIn" without company
      if (!title) {
        const pipeMatch = pageTitle.match(/^(.+?)(?:\s*\|)/);
        if (pipeMatch) title = pipeMatch[1].trim();
      }
    }

    // Strategy 2b: Parse from body text (LinkedIn minimal view)
    if (!title) {
      const lines = document.body.innerText.split("\n").map(l => l.trim()).filter(Boolean);
      // Skip nav items, find first line after "Learning" that looks like a title
      const navEnd = lines.findIndex(l => l === "Learning");
      if (navEnd !== -1 && lines[navEnd + 1]) {
        title = lines[navEnd + 1];
      }
    }

    // Strategy 3: Find /company/ links near the title
    if (!company) {
      const companyLink = document.querySelector('a[href*="/company/"]');
      if (companyLink && companyLink.innerText.trim().length < 80) {
        company = companyLink.innerText.trim();
      }
    }

    // Location — artdeco caption, then classic selectors, then body text regex
    let location =
      getText(".artdeco-entity-lockup__caption") ||
      getText(".job-details-jobs-unified-top-card__bullet") ||
      getText(".topcard__flavor--bullet");

    if (!location) {
      // Parse from body text: "City, ST" pattern near the top
      const bodySnippet = document.body.innerText.substring(0, 800);
      const locMatch = bodySnippet.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})\b/);
      if (locMatch) location = locMatch[0];
    }

    // Description — multiple possible containers, LinkedIn loads lazily
    const descEl =
      document.querySelector(".jobs-description__content .jobs-box__html-content") ||
      document.querySelector(".jobs-description-content__text") ||
      document.querySelector("#job-details") ||
      document.querySelector(".jobs-description__content") ||
      document.querySelector("article.jobs-description");
    let description = descEl ? descEl.innerText.trim() : null;

    // Fallback: grab "About the job" section from body text
    if (!description) {
      const bodyText = document.body.innerText;
      const aboutIdx = bodyText.indexOf("About the job");
      if (aboutIdx !== -1) {
        description = bodyText.substring(aboutIdx, aboutIdx + 5000).trim();
      }
    }

    const salary =
      getText(".salary.compensation__salary") ||
      getText(".job-details-jobs-unified-top-card__job-insight--highlight span");

    const match = url.pathname.match(/\/jobs\/view\/(\d+)/);
    const cleanedUrl = match
      ? `https://www.linkedin.com/jobs/view/${match[1]}/`
      : url.href.split("?")[0];

    return { title, company, location, description, salary, url: cleanedUrl, source: "linkedin" };
  }

  // ── Greenhouse ───────────────────────────────────────────────────────

  function canParseGreenhouse(url) {
    return url.hostname === "boards.greenhouse.io" && url.pathname.includes("/jobs/");
  }

  function parseGreenhouse(url) {
    const title = getText(".app-title") || getText("h1");

    const pathMatch = url.pathname.match(/^\/([^/]+)\/jobs\//);
    const company =
      getText(".company-name") ||
      (pathMatch ? pathMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null);

    const location = getText(".location") || getText(".body--metadata");

    const descEl = document.querySelector("#content");
    const description = descEl ? descEl.innerText.trim() : null;

    return {
      title, company, location, description, salary: null,
      url: url.href.split("?")[0], source: "greenhouse",
    };
  }

  // ── Lever ────────────────────────────────────────────────────────────

  function canParseLever(url) {
    return url.hostname === "jobs.lever.co";
  }

  function parseLever(url) {
    const title = getText(".posting-headline h2") || getText("h2");

    const pathMatch = url.pathname.match(/^\/([^/]+)\//);
    const company =
      getText(".posting-headline .sort-by-time") ||
      (pathMatch ? pathMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null);

    const location = getText(".posting-categories .sort-by-time.posting-category:first-child");

    const sections = document.querySelectorAll(".section.page-centered");
    let description = "";
    sections.forEach((sec) => { description += sec.innerText.trim() + "\n\n"; });

    return {
      title, company, location, description: description.trim() || null,
      salary: null, url: url.href.split("?")[0], source: "lever",
    };
  }

  // ── Indeed ───────────────────────────────────────────────────────────

  function canParseIndeed(url) {
    return url.hostname === "www.indeed.com" &&
      (url.pathname.includes("/viewjob") || url.searchParams.has("vjk") || url.searchParams.has("jk"));
  }

  function parseIndeed(url) {
    const title =
      getText("h1.jobsearch-JobInfoHeader-title") ||
      getText("h1[data-testid='jobTitle']") ||
      getText("h1");

    const company =
      getText("[data-testid='inlineHeader-companyName'] a") ||
      getText("[data-testid='inlineHeader-companyName']") ||
      getText(".jobsearch-CompanyInfoWithoutHeaderImage a");

    const location =
      getText("[data-testid='job-location']") ||
      getText("[data-testid='inlineHeader-companyLocation']");

    const descEl =
      document.querySelector("#jobDescriptionText") ||
      document.querySelector(".jobsearch-jobDescriptionText");
    const description = descEl ? descEl.innerText.trim() : null;

    const salary = getText("#salaryInfoAndJobType .css-2iqe2o") || getText(".salary-snippet-container");

    return {
      title, company, location, description, salary,
      url: url.href.split("&")[0], source: "indeed",
    };
  }

  // ── Generic (fallback) ───────────────────────────────────────────────

  function parseGeneric(url) {
    // Try JSON-LD structured data
    let ldJson = null;
    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const data = JSON.parse(script.textContent);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item["@type"] === "JobPosting") ldJson = item;
        }
      } catch { /* ignore */ }
    });

    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content")?.trim();
    const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();

    const title = ldJson?.title || ogTitle || getText("h1") || document.title.split("|")[0].trim();
    const company = ldJson?.hiringOrganization?.name || ogSiteName || null;
    const location = ldJson?.jobLocation?.address?.addressLocality || null;

    let description = ldJson?.description || null;
    if (!description) {
      let longest = "";
      document.querySelectorAll("article, [class*='description'], main").forEach((el) => {
        const text = el.innerText.trim();
        if (text.length > longest.length) longest = text;
      });
      if (longest.length > 100) description = longest;
    }

    return {
      title, company, location,
      description: description ? description.substring(0, 60000) : null,
      salary: null, url: url.href, source: url.hostname.replace("www.", ""),
    };
  }

  // ── Main: extract and respond to messages ────────────────────────────

  function extractJobData() {
    const url = new URL(window.location.href);
    for (const parser of parsers) {
      if (parser.canParse(url)) {
        try {
          const data = parser.parse(url);
          return { ...data, parsed_by: parser.name };
        } catch (err) {
          console.warn(`[AutoAppli] Parser ${parser.name} failed:`, err);
          continue;
        }
      }
    }
    return null;
  }

  // Listen for requests from the popup
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "EXTRACT_JOB") {
      const data = extractJobData();
      sendResponse({ ok: !!data, data });
    }
    return true; // keep channel open for async
  });

  // Also broadcast on load so the popup can show status immediately
  const initialData = extractJobData();
  if (initialData) {
    chrome.runtime.sendMessage({
      type: "JOB_DETECTED",
      data: initialData,
    }).catch(() => { /* popup might not be open */ });
  }
})();
