from pathlib import Path
import asyncio
import logging
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

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
    public,
    recommendations,
    saved_jobs,
    users,
)
from app.core.config import settings
from app.db.database import Base, engine
from app.db.migrations import ensure_local_schema
from app.models.job import Job
from app.import_jobs import DEFAULT_BRANCHES, DEFAULT_COUNTRIES, import_jobs

Base.metadata.create_all(bind=engine)
ensure_local_schema()
Path("uploads").mkdir(exist_ok=True)

app = FastAPI(title=settings.app_name)
logger = logging.getLogger("uvicorn.error")
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
app.include_router(public.router, prefix="/api/public", tags=["public"])
app.include_router(saved_jobs.router, prefix="/api/saved-jobs", tags=["saved jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["recommendations"])
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["ingestion"])


def _seconds_until_next_run(hour: int = 9, minute: int = 0) -> float:
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    target = datetime.combine(now.date(), time(hour=hour, minute=minute), tzinfo=now.tzinfo)
    if now >= target:
        target += timedelta(days=1)
    return max((target - now).total_seconds(), 0)


async def _run_daily_import_loop() -> None:
    while True:
        await asyncio.sleep(_seconds_until_next_run())
        try:
            logger.info("Starting scheduled TalentIQ job import")
            created_count, skipped_count = await asyncio.to_thread(
                import_jobs,
                [],
                DEFAULT_BRANCHES,
                DEFAULT_COUNTRIES,
                50,
                "imports@talentiq.local",
            )
            logger.info(
                "Scheduled TalentIQ job import finished: created=%s skipped=%s",
                created_count,
                skipped_count,
            )
            with engine.begin() as connection:
                connection.execute(
                    Job.__table__.update()
                    .where(Job.expires_at.is_not(None), Job.expires_at <= datetime.now(ZoneInfo("Asia/Kolkata")))
                    .values(is_active=False)
                )
        except Exception:
            logger.exception("Scheduled TalentIQ job import failed")


@app.on_event("startup")
async def startup_scheduler() -> None:
    asyncio.create_task(_run_daily_import_loop())


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Job Portal API is running"}
