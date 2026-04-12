# AutoAppli: Deepening Roadmap

*A concrete plan for turning AutoAppli from a solid portfolio project into something that demonstrates real engineering depth.*

---

## Where You Are Now

**Frontend:** Next.js 16, TypeScript, Tailwind, shadcn/ui
**Backend:** Python FastAPI with 6 routers (auth, jobs, outreach, profile, resume, search)
**Services:** Claude AI integration, scraper, resume parser/generator, outreach
**Database:** Supabase (Postgres + auth + storage)
**Deployment:** Vercel (frontend) + Render/Fly.io (backend)

You have a working app with a Kanban board, AI resume tailoring, outreach generation, and job search with scraping. That's a strong foundation. The roadmap below is ordered by **impact × learning value**, not difficulty.

---

## Phase 1: Make the AI Actually Good (1–2 weeks)

**Why this matters:** Right now you're calling Claude and displaying the output. That's API integration. Building an eval pipeline turns it into an *AI system* — this is the single biggest differentiator you can add.

### 1A. Resume Tailoring Eval Pipeline

**What to build:** A scoring system that measures how well the tailored resume matches a job description.

**Concrete steps:**
- Create `backend/app/evals/` directory
- Build a `resume_scorer.py` that takes (original resume, tailored resume, job description) and returns:
  - **Keyword coverage score** — what % of key requirements from the JD appear in the resume
  - **Hallucination check** — flag any skills/experiences in the tailored version not present in the original
  - **Change delta** — how much was actually modified (too little = useless, too much = suspicious)
- Store scores in a new `resume_evals` Supabase table
- Show the score breakdown in the frontend when a resume is generated

**Files you'd touch:**
- New: `backend/app/evals/resume_scorer.py`
- New: `backend/app/evals/keyword_extractor.py`
- Modify: `backend/app/services/resume_generator.py` (integrate scoring)
- Modify: `backend/app/routers/resume.py` (return scores)
- New migration: `supabase/migrations/XXXX_resume_evals.sql`
- Frontend: new score display component

**Skills this builds:** AI evaluation, quality metrics, thinking about AI outputs critically — exactly what companies building AI products care about.

### 1B. Prompt Versioning

**What to build:** Store your prompts as versioned configs, not hardcoded strings.

**Concrete steps:**
- Move prompts from `backend/app/prompts/` into a structured format with version numbers
- Log which prompt version generated each output
- Build a simple A/B comparison: generate with two prompt versions, compare eval scores
- Track prompt performance over time in Supabase

**Why this matters for your career:** Every AI team deals with prompt management. Having experience with prompt versioning and evaluation is directly relevant to roles at AI companies.

---

## Phase 2: Chrome Extension (2–3 weeks)

**Why this matters:** This is a completely different engineering domain from web apps. It proves you can learn new platform constraints quickly, and it makes AutoAppli a tool people actually use daily instead of occasionally visit.

### 2A. Core Extension — Save Any Job with One Click

**What to build:** A Chrome extension (Manifest V3) that adds a "Save to AutoAppli" button on job postings.

**Concrete steps:**
- Create `extension/` directory at repo root
- `manifest.json` — Manifest V3 with permissions for job board domains
- `content-scripts/job-extractor.js` — Injected into job board pages, extracts:
  - Job title, company, location, salary (if listed)
  - Full job description text
  - Source URL
- `popup/` — Small React popup showing save confirmation + quick status selector
- `background/service-worker.js` — Handles communication between content script and your API
- `lib/api-client.js` — Authenticated calls to your FastAPI backend

**Job board parsers to build (start with 3):**
- `parsers/linkedin.js` — LinkedIn job postings
- `parsers/greenhouse.js` — Greenhouse hosted job boards (used by hundreds of companies)
- `parsers/lever.js` — Lever job boards

**Key technical challenges:**
- Each job board has different HTML structure — build a parser registry pattern
- Authentication: pass the Supabase JWT from your web app to the extension via `chrome.storage`
- Handle rate limiting and offline/error states gracefully

**Files you'd touch:**
- New directory: `extension/`
- Modify: `backend/app/routers/jobs.py` (new endpoint for extension saves)
- Modify: `backend/app/models/` (extend job model with scraped fields)
- New migration for additional job fields

**Skills this builds:** Browser extension APIs, content scripts, cross-origin messaging, parser patterns, working with unreliable external DOM structures.

### 2B. Auto-Extract on Page Visit

**What to build:** When you visit a job posting, the extension quietly extracts the details and shows a small badge. One click saves it.

**Why it's harder:** You need to detect "is this a job posting?" on arbitrary pages, not just known job boards. This is a classification problem — you could use heuristics (look for "Apply" buttons, salary patterns, job-related keywords) or even a small Claude call.

---

## Phase 3: Robust Scraping Infrastructure (1–2 weeks)

**Why this matters:** Your `scraper_service.py` currently works, but job board scraping is inherently fragile. Building resilient scraping infrastructure is a real backend engineering problem.

### 3A. Scraper Reliability Layer

**What to build:** A scraping system that handles failures gracefully.

**Concrete steps:**
- Create `backend/app/services/scraper/` as a package:
  - `base.py` — Abstract scraper interface
  - `indeed.py`, `linkedin.py`, `greenhouse.py` — Site-specific scrapers
  - `fallback.py` — Generic fallback using Claude to extract structured data from raw HTML
  - `registry.py` — Maps domains to scrapers, with fallback chain
- Add retry logic with exponential backoff
- Cache scraped results in Supabase (don't re-scrape the same URL within 24h)
- Add a health check that periodically tests each scraper against a known URL

**Concrete architecture:**
```
URL comes in
  → registry.py matches domain to specific scraper
  → tries site-specific scraper
  → on failure, falls back to generic Claude extraction
  → caches result
  → returns structured job data
```

**Skills this builds:** Design patterns (strategy/registry), error handling at scale, caching strategies, working with unreliable external systems.

### 3B. Background Job Processing

**What to build:** Move scraping out of the request/response cycle into background jobs.

- Add a simple task queue (start with Python's `asyncio` tasks, graduate to Redis + Celery if needed)
- When a user saves a job URL, immediately return success, then scrape in the background
- Update the frontend via WebSocket or polling when scraping completes

**Skills this builds:** Async processing, task queues, real-time updates — core backend concepts.

---

## Phase 4: Analytics Dashboard (1 week)

**Why this matters:** You're sitting on pipeline data. Visualizing it shows product thinking AND data skills.

### What to build:

A `/dashboard/analytics` page showing:

- **Funnel visualization:** Bookmarked → Applied → Interviewing → Offer (with conversion rates)
- **Response rate by source:** Which job boards lead to more interviews?
- **Time metrics:** Average days from application to first response, average days in each stage
- **Activity heatmap:** When are you most active in your job search?
- **Weekly trends:** Applications sent per week, interviews per week

**Technical approach:**
- New FastAPI endpoint: `GET /api/analytics` with aggregation queries
- Frontend: Use `recharts` (already common in Next.js projects) for visualizations
- All computation server-side in SQL — don't pull all jobs to the client

**Skills this builds:** SQL aggregation, data visualization, product analytics thinking.

---

## Phase 5: Production Hardening (ongoing)

These aren't flashy features, but they demonstrate engineering maturity.

- **Rate limiting on AI endpoints** — Don't let someone burn your Claude API credits. Use a token bucket in Redis or a simple in-memory counter.
- **Row-level security in Supabase** — Ensure users can only see their own jobs, resumes, and outreach.
- **Error monitoring** — Add Sentry (free tier) to both frontend and backend. Handle errors with user-facing messages, not stack traces.
- **API response caching** — Cache job search results and scraped data.
- **Input validation** — Pydantic models for all API inputs (you're probably doing some of this already with FastAPI).
- **CI/CD pipeline** — GitHub Actions running tests + lint on every PR.

---

## Suggested Order

| Priority | Phase | Time | Career Signal |
|----------|-------|------|---------------|
| 1 | 1A: Eval Pipeline | 1 week | "I think about AI quality, not just API calls" |
| 2 | 2A: Chrome Extension | 2 weeks | "I can learn new platforms quickly" |
| 3 | 4: Analytics Dashboard | 1 week | "I think about data and product" |
| 4 | 3A: Scraper Reliability | 1 week | "I build resilient backend systems" |
| 5 | 1B: Prompt Versioning | 3 days | "I understand AI ops" |
| 6 | 3B: Background Jobs | 1 week | "I understand async architecture" |
| 7 | 5: Production Hardening | ongoing | "I ship production-quality code" |
| 8 | 2B: Auto-Extract | 1 week | "I solve ambiguous problems" |

---

## How to Talk About This in Interviews

Don't say: "I built a job application tracker."

Say: "I built an AI-powered job search platform with an evaluation pipeline that measures resume tailoring quality, a Chrome extension that saves jobs from any posting with one click, and a resilient scraping infrastructure with fallback strategies. The eval pipeline caught that our prompts were hallucinating skills 12% of the time, which I fixed by adding grounding constraints."

The difference is specificity and depth. Each phase above gives you a concrete story to tell.

---

*Last updated: April 11, 2026*
