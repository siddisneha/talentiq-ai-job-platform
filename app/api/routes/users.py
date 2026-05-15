from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from sqlalchemy.orm import Session

router = APIRouter()
UPLOAD_DIR = Path("uploads/resumes")


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = user_in.model_dump(exclude_unset=True)
    if data.get("preferred_branch"):
        data["preferred_branch"] = data["preferred_branch"].strip().lower()

    for field, value in data.items():
        setattr(current_user, field, value)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/me/resume", response_model=UserRead)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    extension = Path(file.filename or "resume").suffix.lower()
    safe_extension = extension if extension in {".pdf", ".doc", ".docx", ".txt"} else ".bin"
    filename = f"user-{current_user.id}-{uuid4().hex}{safe_extension}"
    file_path = UPLOAD_DIR / filename

    file_path.write_bytes(await file.read())
    current_user.resume_url = f"/uploads/resumes/{filename}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
