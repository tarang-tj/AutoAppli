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

Create `backend/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
ANTHROPIC_API_KEY=your_anthropic_api_key
JWT_SECRET=your_jwt_secret
```

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Point `CORS_ORIGINS` in `backend/.env` at your real web origin(s); default in code is the production Vercel app.

### 4. Database Setup

Run the SQL migration in your Supabase dashboard to create the required tables:

- `profiles` — User profiles
- `resumes` — Uploaded resumes with parsed text
- `jobs` — Job applications with status tracking
- `generated_documents` — Tailored resumes & cover letters
- `outreach_messages` — Generated emails & LinkedIn messages
- `contacts` — Recruiter/hiring manager contacts

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/me` | Get current user from JWT |
| `POST` | `/resumes/upload` | Upload and parse a PDF resume |
| `GET` | `/resumes` | List user's resumes |
| `POST` | `/resumes/generate` | Generate tailored resume with AI |
| `POST` | `/outreach/generate` | Draft outreach email/LinkedIn message |
| `GET` | `/jobs` | List job applications |
| `POST` | `/jobs` | Add a job application |
| `PATCH` | `/jobs/{id}` | Update job status/details |
| `DELETE` | `/jobs/{id}` | Remove a job application |
| `POST` | `/search` | Search & scrape job listings |

---

## Demo Mode

AutoAppli works without Supabase credentials in **demo mode** — the app loads with sample data so you can explore the UI and features without any setup.

---

## License

MIT
