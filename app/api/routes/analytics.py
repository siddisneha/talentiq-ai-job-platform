from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.application import Application
from app.models.job import Job
from app.models.saved_job import SavedJob
from app.models.user import User
from app.schemas.analytics import AnalyticsSummary
from app.services.recommendations import (
    COMMON_SKILLS,
    extract_known_skills,
    focused_jobs_for_user,
    skills_for_user_focus,
    split_skills,
)

router = APIRouter()


def _top(counter: Counter[str], limit: int = 5):
    return [{"name": name, "count": count} for name, count in counter.most_common(limit)]


def _job_skill_terms(job: Job) -> set[str]:
    text = " ".join([job.title or "", job.skills or ""])
    extracted = set(extract_known_skills(text))
    listed_skills = {skill for skill in split_skills(job.skills or "") if skill in COMMON_SKILLS}
    return extracted.union(listed_skills)


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs_query = db.query(Job).filter(
        Job.is_active.is_(True),
        or_(Job.source_name.is_(None), Job.source_name != "Sample Seed Feed"),
        or_(Job.source_url.is_(None), ~Job.source_url.ilike("https://example.com/%")),
    )
    active_jobs_count = jobs_query.count()
    jobs = (
        jobs_query
        .with_entities(
            Job.id,
            Job.title,
            Job.company,
            Job.location,
            Job.job_type,
            Job.salary_min,
            Job.salary_max,
            Job.skills,
            Job.description,
            Job.source_url,
            Job.external_id,
            Job.source_name,
            Job.source_id,
            Job.is_active,
            Job.posted_by_id,
            Job.created_at,
        )
        .order_by(Job.created_at.desc())
        .limit(350)
        .all()
    )
    jobs = [
        Job(
            id=job.id,
            title=job.title,
            company=job.company,
            location=job.location,
            job_type=job.job_type,
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            skills=job.skills,
            description="",
            source_url=job.source_url,
            external_id=job.external_id,
            source_name=job.source_name,
            source_id=job.source_id,
            is_active=job.is_active,
            posted_by_id=job.posted_by_id,
            created_at=job.created_at,
        )
        for job in jobs
    ]

    role_counter = Counter(job.title for job in jobs)
    location_counter = Counter(job.location for job in jobs)

    skill_counter: Counter[str] = Counter()
    for job in jobs:
        skill_counter.update(_job_skill_terms(job))

    application_job_counts = (
        db.query(Job.title, func.count(Application.id))
        .join(Application, Application.job_id == Job.id)
        .group_by(Job.title)
        .order_by(func.count(Application.id).desc())
        .limit(10)
        .all()
    )

    skill_gap_jobs = focused_jobs_for_user(jobs, current_user)
    skill_gap_counter: Counter[str] = Counter()
    for job in skill_gap_jobs:
        skill_gap_counter.update(_job_skill_terms(job))

    focus_skills = skills_for_user_focus(current_user)
    if focus_skills:
        skill_gap_counter.update({skill: 1 for skill in focus_skills})

    salary_row = db.query(
        func.min(Job.salary_min),
        func.max(Job.salary_max),
        func.avg(Job.salary_min),
        func.avg(Job.salary_max),
    ).filter(Job.is_active.is_(True)).one()

    status_counts = (
        db.query(Application.status, func.count(Application.id))
        .filter(Application.user_id == current_user.id)
        .group_by(Application.status)
        .all()
    )

    user_skills = split_skills(current_user.skills or "")
    market_skills = [item["name"] for item in _top(skill_gap_counter, limit=12)]
    missing_skills = [skill for skill in market_skills if skill not in user_skills]

    return {
        "total_users": db.query(User).count(),
        "active_jobs": active_jobs_count,
        "total_applications": db.query(Application).count(),
        "total_saved_jobs": db.query(SavedJob).count(),
        "total_activity_events": db.query(ActivityLog).count(),
        "applications_per_job": [
            {"name": title or "Unknown job", "count": count}
            for title, count in application_job_counts
        ],

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
            {"name": status or "unknown", "count": count}
            for status, count in status_counts
        ],

        "user_skills": sorted(user_skills),
        "missing_skills": missing_skills,
    }
