# AutoAppli

An AI-powered job application automation platform that helps job seekers streamline their search with tailored resumes, smart outreach, and organized tracking.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude_AI-Anthropic-D4A574)

---

## Features

### 🎯 AI Resume Tailoring
Upload your base resume and paste a job description — AutoAppli uses Claude AI to generate a tailored resume that highlights relevant experience and matches keywords.

### ✉️ Smart Outreach Drafting
Generate personalized cold emails and LinkedIn messages for recruiters and hiring managers, customized to each role and company.

### 📋 Kanban Job Tracker
Visual drag-and-drop board to manage applications across stages: **Bookmarked → Applied → Interviewing → Offer → Rejected**. Jump from any card to **Resume Builder** or **Outreach** with the role’s title, company, and saved description carried over (via a one-time browser handoff).

### 🔍 Job Search & Scraping
Search live listings (e.g. Indeed), save to the Kanban in one click, optionally **scrape the full job description** from the posting URL for better resume tailoring, and avoid duplicates when the same URL is already on your board.

### 🏠 Public landing
Signed-out visitors see a **marketing home page** at `/` (with Supabase auth enabled, signed-in users are redirected to the dashboard). **`/privacy`** and **`/terms`** stay public alongside login and signup.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui (default **dark** UI for contrast) |
| **Backend** | Python FastAPI |
| **AI Engine** | Claude API (Anthropic SDK) |
| **Database** | Supabase (PostgreSQL + Auth + Storage) |
| **Drag & Drop** | @hello-pangea/dnd |
| **PDF Processing** | pdfplumber, ReportLab |

---

## Project Structure

```
AutoAppli/
├── frontend/                     # Next.js app
│   ├── src/app/                  # App Router pages
│   │   ├── (auth)/               # Login & signup
│   │   ├── dashboard/            # Kanban job tracker
│   │   ├── resume/               # Resume upload & tailoring
│   │   ├── outreach/             # Message generation
│   │   └── jobs/                 # Job search
│   ├── src/components/           # UI components
│   ├── src/hooks/                # Data fetching hooks
│   ├── src/lib/                  # Supabase clients, API utils
│   └── src/types/                # TypeScript types
│
├── backend/                      # FastAPI app
│   ├── app/main.py               # App entry point, CORS config
│   ├── app/routers/              # API route handlers
│   │   ├── auth.py               # JWT authentication
│   │   ├── resume.py             # Upload & generate resumes
│   │   ├── outreach.py           # Generate outreach messages
│   │   ├── jobs.py               # CRUD job applications
│   │   └── search.py             # Job search & scraping
│   ├── app/services/             # Business logic
│   │   ├── claude_service.py     # Anthropic SDK wrapper
│   │   ├── resume_parser.py      # PDF text extraction
│   │   ├── resume_generator.py   # Tailored PDF generation
│   │   ├── outreach_service.py   # Message drafting
│   │   └── scraper_service.py    # Web scraping
│   └── app/prompts/              # AI prompt templates
│
└── supabase/                     # Database migrations
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account (or run locally with Supabase CLI)
- Anthropic API key

### 1. Clone the repo

```bash
git clone https://github.com/tarang-tj/AutoAppli.git
cd AutoAppli
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://your-frontend.vercel.app
NEXT_PUBLIC_API_URL=https://your-deployed-api.example.com
```

```bash
npm run dev
```

Use your deployed API URL for `NEXT_PUBLIC_API_URL` (no localhost default in the app).

### 3. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` (see `backend/.env.example`):

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
ANTHROPIC_API_KEY=your_anthropic_api_key
CORS_ORIGINS=https://your-frontend.vercel.app
```

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Point `CORS_ORIGINS` in `backend/.env` at your real web origin(s); default in code is the production Vercel app.

### 4. Database Setup

Run SQL in the Supabase **SQL Editor** (or via CLI) to create the tables you need.

**Jobs (Kanban) — included in this repo**

When the API has **`SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`**, and **`SUPABASE_JWT_SECRET`** set, job routes persist to Postgres instead of in-memory storage. Apply:

`supabase/migrations/20260406120000_create_jobs.sql`

The frontend must send the Supabase session **`Authorization: Bearer <access_token>`** on job requests (already wired when Supabase auth is enabled).

**Job search (listing cache + per-user history)**

Apply:

`supabase/migrations/20260407120000_job_search.sql`

This adds **`job_listings`** (deduped by URL), **`job_searches`** (one row per search run), and **`job_search_result_items`** (ordered links). With Supabase configured, **`POST /search`** persists when the request includes a valid Bearer token; **`GET /search/history`** lists recent runs for that user. Anonymous searches still work but are not stored.

Other tables you may add for a full product (not all are defined in-repo yet):

- `profiles` — User profiles
- `resumes` — Uploaded resumes with parsed text
- `generated_documents` — Tailored resumes & cover letters
- `outreach_messages` — Generated emails & LinkedIn messages
- `contacts` — Recruiter/hiring manager contacts

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/me` | Resolve caller from Bearer token when Supabase-backed jobs are enabled |
| `POST` | `/resumes/upload` | Upload and parse a PDF resume |
| `GET` | `/resumes` | List user's resumes |
| `POST` | `/resumes/generate` | Generate tailored resume with AI |
| `POST` | `/outreach/generate` | Draft outreach email/LinkedIn message |
| `GET` | `/jobs` | List job applications |
| `POST` | `/jobs` | Add a job (`fetch_full_description` scrapes posting HTML; same URL returns `{ ..., duplicate: true }`) |
| `PATCH` | `/jobs/{id}` | Partial update: `status`, `notes`, or both |
| `PUT` | `/jobs/reorder` | Persist column order (`status`, `ordered_ids`) |
| `DELETE` | `/jobs/{id}` | Remove a job application |
| `GET` | `/search/history` | Recent job searches (requires Bearer when using Supabase persistence) |
| `GET` | `/search/runs/{search_id}/results` | Saved listings for a past search (cached; Bearer + persistence) |
| `POST` | `/search` | Scrape job listings; body may include `remote_only`; returns `{ results, search_id, persisted }` |

When jobs are stored in Supabase (see Database Setup), the **`/jobs`** routes require a valid Supabase **`Bearer` access token** verified with **`SUPABASE_JWT_SECRET`**.

---

## Demo Mode

AutoAppli works without Supabase credentials in **demo mode** — the app loads with sample data so you can explore the UI and features without any setup.

---

## Production launch checklist

1. **Vercel (frontend)**  
   See [Vercel deployment](#vercel-deployment) below. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional `NEXT_PUBLIC_API_URL`, and **`NEXT_PUBLIC_SITE_URL`** (see [NEXT_PUBLIC_SITE_URL](#next_public_site_url)).

2. **API host (e.g. Render, Fly)**  
   Set `ANTHROPIC_API_KEY`, Supabase keys, and **`CORS_ORIGINS`** to your exact frontend origin(s), comma-separated if needed. Confirm **`GET /api/v1/health`** returns `{"status":"ok"}`.

3. **Supabase**  
   Apply SQL migrations (Kanban: `20260406120000_create_jobs.sql`; job search history: `20260407120000_job_search.sql`), configure Auth redirect URLs for your production domain, and review Row Level Security policies.

4. **Legal**  
   Replace the placeholder copy on `/privacy` and `/terms` with counsel-reviewed documents before marketing the product broadly.

5. **Secrets**  
   Never commit `.env` or `.env.local`. Rotate any keys that were ever committed or shared.

### Vercel deployment

Deploy from the **latest `main`** so you pick up current TypeScript and build fixes.

**Option A — Root Directory: `frontend`**

- Install Command: default (`npm install` in `frontend`).
- Build Command: default (`npm run build` → `next build --webpack`).

**Option B — Root Directory: repository root** *(empty / default root)*

- The root `package.json` **`postinstall`** runs `npm ci` (or `npm install`) in `frontend/`, and **`npm run build`** runs `npm run build --prefix frontend` (same as `next build --webpack` inside `frontend/`).

After changing Root Directory or env vars, trigger a **Redeploy** on the latest commit. If the build fails, open the deployment **Build** log and jump to the first `Error` line (often TypeScript or a missing module).

### NEXT_PUBLIC_SITE_URL

This is the **canonical public URL of your Next.js app** (the address people type in the browser). It drives `metadataBase`, Open Graph links, `sitemap.xml`, and `robots.txt`.

**What to set it to**

- **Production:** Your real site, with `https` and **no trailing slash**, for example:
  - `https://your-project.vercel.app`, or
  - `https://www.yourdomain.com` if you use a custom domain on Vercel.
- **Local dev:** You usually **omit** it; the app falls back to `http://localhost:3000`.
- **If you omit it on Vercel:** The app uses the `VERCEL_URL` hostname (still `https://…` in code). That works for previews, but production URLs in metadata may look like deployment-specific hostnames unless you set this variable.

**Where to set it (Vercel)**

1. Project → **Settings** → **Environment Variables**.
2. Add **`NEXT_PUBLIC_SITE_URL`** = `https://your-exact-production-domain`.
3. Scope it at least to **Production** (add **Preview** too only if you want previews to advertise a fixed URL—often you leave Preview unset so `VERCEL_URL` is used per deployment).
4. Redeploy so the new value is baked into the client bundle.

**Also set `CORS_ORIGINS`** on the API to the **same origin** (e.g. `https://www.yourdomain.com`) so the browser can call your FastAPI backend.

---

## License

MIT
