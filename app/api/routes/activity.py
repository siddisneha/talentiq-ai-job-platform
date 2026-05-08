from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityRead

router = APIRouter()


@router.get("/", response_model=list[ActivityRead])
def list_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(100)
        .all()
    )


@router.post("/", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def track_activity(
    activity_in: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = ActivityLog(**activity_in.model_dump(), user_id=current_user.id)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity
