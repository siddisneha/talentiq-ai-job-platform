from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.application import Application
from app.models.job import Job
from app.models.saved_job import SavedJob
from app.models.user import User
from app.schemas.analytics import AnalyticsSummary
from app.services.recommendations import split_skills

router = APIRouter()


def _top(counter: Counter[str], limit: int = 5):
    return [{"name": name, "count": count} for name, count in counter.most_common(limit)]


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(Job).filter(Job.is_active.is_(True)).all()
    role_counter = Counter(job.title for job in jobs)
    location_counter = Counter(job.location for job in jobs)
    skill_counter: Counter[str] = Counter()
    for job in jobs:
        skill_counter.update(split_skills(job.skills))

    salary_row = db.query(
        func.min(Job.salary_min),
        func.max(Job.salary_max),
        func.avg(Job.salary_min),
        func.avg(Job.salary_max),
    ).filter(Job.is_active.is_(True)).one()

    status_counts = (
        db.query(Application.status, func.count(Application.id))
        .group_by(Application.status)
        .all()
    )

    return {
        "total_users": db.query(User).count(),
        "active_jobs": len(jobs),
        "total_applications": db.query(Application).count(),
        "total_saved_jobs": db.query(SavedJob).count(),
        "total_activity_events": db.query(ActivityLog).count(),
        "top_roles": _top(role_counter),
        "top_locations": _top(location_counter),
        "top_skills": _top(skill_counter),
        "salary_ranges": {
            "minimum": salary_row[0],
            "maximum": salary_row[1],
            "average_minimum": salary_row[2],
            "average_maximum": salary_row[3],
        },
        "application_statuses": [
            {"name": status or "unknown", "count": count} for status, count in status_counts
        ],
    }
