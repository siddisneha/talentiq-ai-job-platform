from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import app.models
from app.api.routes import (
    activity,
    alerts,
    analytics,
    applications,
    auth,
    dashboard,
    ingestion,
    job_sources,
    jobs,
    recommendations,
    saved_jobs,
    users,
)
from app.core.config import settings
from app.db.database import Base, engine
from app.db.migrations import ensure_local_schema

Base.metadata.create_all(bind=engine)
ensure_local_schema()
Path("uploads").mkdir(exist_ok=True)

app = FastAPI(title=settings.app_name)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(job_sources.router, prefix="/api/job-sources", tags=["job sources"])
app.include_router(saved_jobs.router, prefix="/api/saved-jobs", tags=["saved jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["ingestion"])


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Job Portal API is running"}
