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
Visual drag-and-drop board to manage applications across stages: **Bookmarked → Applied → Interviewing → Offer → Rejected**

### 🔍 Job Search & Scraping
Search for job listings across the web and save them directly to your tracker with one click.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
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

- `profiles` — User p