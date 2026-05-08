from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.job import Job
from app.models.job_alert import JobAlert
from app.models.user import User
from app.schemas.alert import JobAlertCreate, JobAlertMatches, JobAlertRead, JobAlertUpdate

router = APIRouter()


def _alert_query(db: Session, alert: JobAlert):
    query = db.query(Job).filter(Job.is_active.is_(True))
    if alert.keyword:
        query = query.filter(Job.title.ilike(f"%{alert.keyword}%"))
    if alert.location:
        query = query.filter(Job.location.ilike(f"%{alert.location}%"))
    if alert.skill:
        query = query.filter(Job.skills.ilike(f"%{alert.skill}%"))
    if alert.minimum_salary:
        query = query.filter(Job.salary_max >= alert.minimum_salary)
    return query.order_by(Job.created_at.desc())


@router.get("/", response_model=list[JobAlertRead])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(JobAlert)
        .filter(JobAlert.user_id == current_user.id)
        .order_by(JobAlert.created_at.desc())
        .all()
    )


@router.post("/", response_model=JobAlertRead, status_code=status.HTTP_201_CREATED)
def create_alert(
    alert_in: JobAlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = JobAlert(**alert_in.model_dump(), user_id=current_user.id)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.patch("/{alert_id}", response_model=JobAlertRead)
def update_alert(
    alert_id: int,
    alert_in: JobAlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = (
        db.query(JobAlert)
        .filter(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    for field, value in alert_in.model_dump(exclude_unset=True).items():
        setattr(alert, field, value)

    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/{alert_id}/matches", response_model=JobAlertMatches)
def alert_matches(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = (
        db.query(JobAlert)
        .filter(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"alert": alert, "matches": _alert_query(db, alert).limit(20).all()}


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = (
        db.query(JobAlert)
        .filter(JobAlert.id == alert_id, JobAlert.user_id == current_user.id)
        .first()
    )
    if alert:
        db.delete(alert)
        db.commit()
    return None
