from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import analytics, auth, interview, jobs, match, outreach, profile, resume, search

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(resume.router, prefix="/api/v1")
app.include_router(outreach.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(match.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health():
    from app.deps.jobs_auth import jobs_use_supabase

    s = get_settings()
    supa = jobs_use_supabase(s)
    return {
        "status": "ok",
        "jobs_storage": "supabase" if supa else "memory",
        "search_history": "on" if supa else "off",
        "resume_outreach_storage": "supabase" if supa else "per_user_memory",
        "profile_documents": "supabase" if supa else "off",
    }
