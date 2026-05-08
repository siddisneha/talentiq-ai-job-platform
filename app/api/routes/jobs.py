from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreate, JobRead, JobUpdate

router = APIRouter()


@router.get("/", response_model=list[JobRead])
def list_jobs(
    search: str | None = Query(default=None),
    location: str | None = Query(default=None),
    skill: str | None = Query(default=None),
    job_type: str | None = Query(default=None),
    salary_min: int | None = Query(default=None),
    salary_max: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Job).filter(Job.is_active.is_(True))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Job.title.ilike(pattern),
                Job.company.ilike(pattern),
                Job.description.ilike(pattern),
            )
        )
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if skill:
        query = query.filter(Job.skills.ilike(f"%{skill}%"))
    if job_type:
        query = query.filter(Job.job_type.ilike(f"%{job_type}%"))
    if salary_min is not None:
        query = query.filter(Job.salary_max >= salary_min)
    if salary_max is not None:
        query = query.filter(Job.salary_min <= salary_max)

    return query.order_by(Job.created_at.desc()).all()


@router.post("/", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = Job(**job_in.model_dump(), posted_by_id=current_user.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobRead)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.patch("/{job_id}", response_model=JobRead)
def update_job(
    job_id: int,
    job_in: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    for field, value in job_in.model_dump(exclude_unset=True).items():
        setattr(job, field, value)

    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.is_active = False
    db.add(job)
    db.commit()
    return None
