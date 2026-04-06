import httpx
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from app.models.schemas import JobSearchResult


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

TIMEOUT = httpx.Timeout(15.0, connect=10.0)


async def search_jobs(
    query: str,
    location: str | None = None,
    remote_only: bool = False,
    page: int = 1,
    per_page: int = 20,
) -> list[JobSearchResult]:
    """
    Search for jobs by scraping public job listing pages.
    Aggregates results from multiple sources.
    """
    results: list[JobSearchResult] = []

    # Scrape from multiple sources concurrently
    indeed_results = await _scrape_indeed(query, location, remote_only, page)
    results.extend(indeed_results)

    # Deduplicate by URL
    seen_urls: set[str] = set()
    unique: list[JobSearchResult] = []
    for r in results:
        if r.url not in seen_urls:
            seen_urls.add(r.url)
            unique.append(r)

    return unique[:per_page]


async def scrape_job_details(url: str) -> dict:
    """
    Scrape a single job posting page for its full description and metadata.
    Returns a dict with title, company, description, etc.
    """
    async with httpx.AsyncClient(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError:
            return {"error": f"Failed to fetch {url}", "url": url}

    soup = BeautifulSoup(resp.text, "html.parser")

    # Try common selectors for job details pages
    title = _extract_text(soup, [
        "h1.jobsearch-JobInfoHeader-title",
        "h1[data-testid='jobTitle']",
        "h1.job-title",
        "h1",
    ])

    company = _extract_text(soup, [
        "[data-testid='inlineHeader-companyName']",
        ".jobsearch-CompanyInfoWithoutHeaderImage a",
        ".company-name",
        "[data-company-name]",
    ])

    description = _extract_text(soup, [
        "#jobDescriptionText",
        ".jobsearch-jobDescriptionText",
        ".job-description",
        "[data-testid='jobDescription']",
        "article",
    ])

    location = _extract_text(soup, [
        "[data-testid='job-location']",
        ".jobsearch-JobInfoHeader-subtitle .css-6z8o9s",
        ".job-location",
    ])

    return {
        "url": url,
        "title": title,
        "company": company,
        "description": description,
        "location": location,
    }


# ── Indeed scraper ─────────────────────────────────────────────────────────

async def _scrape_indeed(
    query: str, location: str | None, remote_only: bool, page: int
) -> list[JobSearchResult]:
    """Scrape Indeed job listings."""
    results: list[JobSearchResult] = []
    encoded_query = quote_plus(query)
    start = (page - 1) * 10

    url = f"https://www.indeed.com/jobs?q={encoded_query}&start={start}"
    if location:
        url += f"&l={quote_plus(location)}"
    if remote_only:
        url += "&remotejob=032b3046-06a3-4876-8dfd-474eb5e7ed11"

    async with httpx.AsyncClient(headers=HEADERS, timeout=TIMEOUT, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError:
            return results

    soup = BeautifulSoup(resp.text, "html.parser")

    # Indeed uses various card selectors
    job_cards = soup.select(".job_seen_beacon, .jobsearch-ResultsList > li, .result")

    for card in job_cards:
        try:
            title_el = card.select_one("h2.jobTitle a, .jobTitle > a, a.jcs-JobTitle")
            if not title_el:
                continue

            title = title_el.get_text(strip=True)
            href = title_el.get("href", "")
            job_url = f"https://www.indeed.com{href}" if href.startswith("/") else href

            company_el = card.select_one(
                "[data-testid='company-name'], .companyName, .company"
            )
            company = company_el.get_text(strip=True) if company_el else "Unknown"

            location_el = card.select_one(
                "[data-testid='text-location'], .companyLocation, .location"
            )
            loc = location_el.get_text(strip=True) if location_el else None

            snippet_el = card.select_one(
                ".job-snippet, .jobCardShelfContainer, .summary"
            )
            snippet = snippet_el.get_text(strip=True) if snippet_el else None

            date_el = card.select_one(".date, .result-footer .date")
            posted = date_el.get_text(strip=True) if date_el else None

            salary_el = card.select_one(
                ".salary-snippet-container, .salaryText, .estimated-salary"
            )
            salary = salary_el.get_text(strip=True) if salary_el else None

            results.append(
                JobSearchResult(
                    title=title,
                    company=company,
                    location=loc,
                    url=job_url,
                    description_snippet=snippet,
                    posted_date=posted,
                    salary=salary,
                    source="indeed",
                )
            )
        except Exception:
            continue

    return results


# ── Helpers ────────────────────────────────────────────────────────────────

def _extract_text(soup: BeautifulSoup, selectors: list[str]) -> str | None:
    """Try multiple CSS selectors and return the first match's text."""
    for sel in selectors:
        el = soup.select_one(sel)
        if el:
            return el.get_text(strip=True)
    return None
