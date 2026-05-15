from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationUpdate,
    EmployerApplicationRead,
)

router = APIRouter()

APPLICATION_STATUSES = {
    "applied",
    "screening",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
}


def can_manage_applications(user: User) -> bool:
    return user.role in {"employer", "admin"}


@router.get("/", response_model=list[ApplicationRead])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
        .all()
    )


@router.get("/employer", response_model=list[EmployerApplicationRead])
def list_employer_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not can_manage_applications(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employer or admin accounts can view job applicants",
        )

    query = db.query(Application).join(Job, Application.job_id == Job.id)
    if current_user.role != "admin":
        query = query.filter(Job.posted_by_id == current_user.id)
    return query.order_by(Application.created_at.desc()).all()


@router.post("/", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    application_in: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidate accounts can apply to jobs",
        )

    if application_in.status not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid application status")

    job = db.get(Job, application_in.job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = (
        db.query(Application)
        .filter(
            Application.user_id == current_user.id,
            Application.job_id == application_in.job_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already applied to this job")

    application = Application(**application_in.model_dump(), user_id=current_user.id)
    activity = ActivityLog(
        user_id=current_user.id,
        job_id=application_in.job_id,
        event_type="application_submitted",
    )
    db.add(application)
    db.add(activity)
    db.commit()
    db.refresh(application)
    return application


@router.patch("/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: int,
    application_in: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if application_in.status and application_in.status not in APPLICATION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid application status")

    application = (
        db.query(Application)
        .join(Job, Application.job_id == Job.id)
        .filter(Application.id == application_id)
    )
    if can_manage_applications(current_user):
        if current_user.role != "admin":
            application = application.filter(Job.posted_by_id == current_user.id)
    else:
        application = application.filter(Application.user_id == current_user.id)

    application = application.first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    for field, value in application_in.model_dump(exclude_unset=True).items():
        setattr(application, field, value)

    db.add(application)
    db.commit()
    db.refresh(application)
    return application
