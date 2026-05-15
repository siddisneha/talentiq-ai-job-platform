from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.job_source import JobSource
from app.models.user import User
from app.schemas.job_source import JobSourceCreate, JobSourceRead, JobSourceUpdate

router = APIRouter()


def ensure_can_manage_sources(user: User) -> None:
    if user.role not in {"employer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employer or admin accounts can manage job sources",
        )


@router.get("/", response_model=list[JobSourceRead])
def list_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(JobSource).order_by(JobSource.created_at.desc()).all()


@router.post("/", response_model=JobSourceRead, status_code=status.HTTP_201_CREATED)
def create_source(
    source_in: JobSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_sources(current_user)
    existing = db.query(JobSource).filter(JobSource.name == source_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Job source already exists")

    source = JobSource(**source_in.model_dump())
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.patch("/{source_id}", response_model=JobSourceRead)
def update_source(
    source_id: int,
    source_in: JobSourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_sources(current_user)
    source = db.get(JobSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Job source not found")

    for field, value in source_in.model_dump(exclude_unset=True).items():
        setattr(source, field, value)

    db.add(source)
    db.commit()
    db.refresh(source)
    return source


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_sources(current_user)
    source = db.get(JobSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="Job source not found")

    source.is_active = False
    db.add(source)
    db.commit()
    return None
