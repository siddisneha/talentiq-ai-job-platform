from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timezone
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreate, JobRead, JobUpdate
from app.services.role_packs import BRANCH_ROLE_PACKS, normalize_branch_key

router = APIRouter()

COUNTRY_LOCATION_ALIASES = {
    "india": ["india", "bengaluru", "bangalore", "hyderabad", "pune", "mumbai", "delhi", "chennai", "gurugram", "noida", "remote", "worldwide", "global", "anywhere"],
    "united states": ["united states", "usa", "us", "new york", "san francisco", "california", "texas", "seattle", "remote us", "remote", "worldwide", "global", "anywhere"],
    "united kingdom": ["united kingdom", "uk", "london", "england", "remote uk", "remote", "worldwide", "global", "anywhere"],
    "canada": ["canada", "toronto", "vancouver", "ontario", "remote canada", "remote", "worldwide", "global", "anywhere"],
    "australia": ["australia", "sydney", "melbourne", "remote australia", "remote", "worldwide", "global", "anywhere"],
    "germany": ["germany", "berlin", "munich", "remote germany", "remote", "worldwide", "global", "anywhere"],
    "singapore": ["singapore", "remote", "worldwide", "global", "anywhere"],
    "remote": ["remote", "worldwide", "global", "anywhere"],
    "worldwide": ["worldwide", "global", "anywhere"],
}


def ensure_can_manage_jobs(user: User) -> None:
    if user.role not in {"employer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employer or admin accounts can manage job posts",
        )


def real_job_query(db: Session):
    return db.query(Job).filter(
        Job.is_active.is_(True),
        or_(Job.expires_at.is_(None), Job.expires_at > datetime.now(timezone.utc)),
        or_(Job.source_name.is_(None), Job.source_name != "Sample Seed Feed"),
        or_(Job.source_url.is_(None), ~Job.source_url.ilike("https://example.com/%")),
    )


@router.get("/", response_model=list[JobRead])
def list_jobs(
    search: str | None = Query(default=None),
    branch: str | None = Query(default=None),
    location: str | None = Query(default=None),
    skill: str | None = Query(default=None),
    job_type: str | None = Query(default=None),
    salary_min: int | None = Query(default=None),
    salary_max: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = real_job_query(db)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Job.title.ilike(pattern),
                Job.company.ilike(pattern),
                Job.description.ilike(pattern),
                Job.skills.ilike(pattern),
            )
        )
    if branch:
        branch_pack = BRANCH_ROLE_PACKS.get(normalize_branch_key(branch))
        if branch_pack:
            branch_terms = branch_pack["roles"]
            query = query.filter(
                or_(
                    *(
                        condition
                        for term in branch_terms
                        for condition in (
                            Job.title.ilike(f"%{term}%"),
                            Job.description.ilike(f"%{term}%"),
                            Job.skills.ilike(f"%{term}%"),
                        )
                    )
                )
            )
    if location:
        location_terms = COUNTRY_LOCATION_ALIASES.get(location.lower(), [location])
        query = query.filter(or_(*(Job.location.ilike(f"%{term}%") for term in location_terms)))
    if skill:
        query = query.filter(Job.skills.ilike(f"%{skill}%"))
    if job_type:
        query = query.filter(Job.job_type.ilike(f"%{job_type}%"))
    if salary_min is not None:
        query = query.filter(Job.salary_max >= salary_min)
    if salary_max is not None:
        query = query.filter(Job.salary_min <= salary_max)

    return query.order_by(Job.created_at.desc()).all()


@router.get("/mine", response_model=list[JobRead])
def list_my_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_jobs(current_user)
    query = db.query(Job)
    if current_user.role != "admin":
        query = query.filter(Job.posted_by_id == current_user.id)
    return query.order_by(Job.created_at.desc()).all()


@router.post("/", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_jobs(current_user)
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
    ensure_can_manage_jobs(current_user)
    if current_user.role != "admin" and job.posted_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can update only jobs posted by your account",
        )

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
    ensure_can_manage_jobs(current_user)
    if current_user.role != "admin" and job.posted_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only jobs posted by your account",
        )
    job.is_active = False
    db.add(job)
    db.commit()
    return None
