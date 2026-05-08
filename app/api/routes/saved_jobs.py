from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.job import Job
from app.models.saved_job import SavedJob
from app.models.user import User
from app.schemas.saved_job import SavedJobRead

router = APIRouter()


@router.get("/", response_model=list[SavedJobRead])
def list_saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id)
        .order_by(SavedJob.created_at.desc())
        .all()
    )


@router.post("/{job_id}", response_model=SavedJobRead, status_code=status.HTTP_201_CREATED)
def save_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.get(Job, job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        .first()
    )
    if existing:
        return existing

    saved_job = SavedJob(user_id=current_user.id, job_id=job_id)
    activity = ActivityLog(
        user_id=current_user.id,
        job_id=job_id,
        event_type="job_saved",
    )
    db.add(saved_job)
    db.add(activity)
    db.commit()
    db.refresh(saved_job)
    return saved_job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_job = (
        db.query(SavedJob)
        .filter(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        .first()
    )
    if saved_job:
        db.delete(saved_job)
        db.commit()
    return None
