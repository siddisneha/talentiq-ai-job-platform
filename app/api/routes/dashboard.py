from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.application import Application
from app.models.activity_log import ActivityLog
from app.models.job import Job
from app.models.job_alert import JobAlert
from app.models.saved_job import SavedJob
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.services.recommendations import score_job_for_user

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_count = db.query(SavedJob).filter(SavedJob.user_id == current_user.id).count()
    application_count = (
        db.query(Application).filter(Application.user_id == current_user.id).count()
    )
    active_job_count = db.query(Job).filter(Job.is_active.is_(True)).count()
    alerts_count = (
        db.query(JobAlert)
        .filter(JobAlert.user_id == current_user.id, JobAlert.is_active.is_(True))
        .count()
    )
    recent_activity_count = (
        db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).count()
    )

    jobs = db.query(Job).filter(Job.is_active.is_(True)).all()
    scored_jobs = sorted(
        jobs,
        key=lambda job: score_job_for_user(job, current_user)[0],
        reverse=True,
    )

    return {
        "user_name": current_user.full_name,
        "saved_jobs_count": saved_count,
        "applications_count": application_count,
        "active_jobs_count": active_job_count,
        "alerts_count": alerts_count,
        "recent_activity_count": recent_activity_count,
        "recommended_jobs": scored_jobs[:5],
    }
