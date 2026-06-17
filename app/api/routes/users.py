from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.user import AdminUserRead, ResumeParseResult, USER_ROLES, UserRead, UserRoleUpdate, UserUpdate
from app.services.resume_parser import parse_resume

router = APIRouter()
UPLOAD_DIR = Path("uploads/resumes")
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def ensure_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin accounts can manage users",
        )


@router.get("/", response_model=list[AdminUserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)
    return db.query(User).order_by(User.created_at.desc()).all()


@router.patch("/{user_id}/role", response_model=AdminUserRead)
def update_user_role(
    user_id: int,
    user_in: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_admin(current_user)
    if user_in.role not in USER_ROLES:
        raise HTTPException(status_code=400, detail="Invalid user role")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = user_in.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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


@router.post("/me/resume", response_model=ResumeParseResult, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Resume upload is only available for candidate accounts",
        )

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "resume").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported resume format. Upload PDF, DOCX, or TXT.",
        )

    filename = f"user-{current_user.id}-{uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / filename

    content = await file.read()
    file_path.write_bytes(content)

    parsed = parse_resume(file_path)
    current_user.resume_url = f"/uploads/resumes/{filename}"
    if parsed.skills:
        current_user.skills = ", ".join(parsed.skills)
    if parsed.full_name and not current_user.full_name:
        current_user.full_name = parsed.full_name
    if parsed.phone and not current_user.phone:
        current_user.phone = parsed.phone
    if parsed.summary and not current_user.summary:
        current_user.summary = parsed.summary
    if parsed.education and not current_user.education:
        current_user.education = parsed.education
    if parsed.experience_years and not current_user.experience_years:
        current_user.experience_years = parsed.experience_years
    if parsed.inferred_role and not current_user.preferred_role:
        current_user.preferred_role = parsed.inferred_role
    if parsed.email and current_user.email.lower() != parsed.email.lower():
        # Keep the account email intact, but we can still surface the parsed email in the response.
        pass

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    preview = parsed.text[:500].strip()
    return {
        "message": "Resume uploaded and parsed successfully",
        "resume_url": current_user.resume_url,
        "extracted_text": parsed.text,
        "extracted_text_preview": preview,
        "extracted_skills": parsed.skills,
        "inferred_profile": {
            "full_name": parsed.full_name,
            "email": parsed.email,
            "phone": parsed.phone,
            "summary": parsed.summary,
            "education": parsed.education,
            "experience_years": parsed.experience_years,
            "preferred_role": parsed.inferred_role,
        },
        "user": current_user,
    }


@router.get("/me/resume/parsed", response_model=ResumeParseResult)
def read_saved_resume(
    current_user: User = Depends(get_current_user),
):
    if not current_user.resume_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume has been uploaded yet",
        )

    relative_path = current_user.resume_url.lstrip("/")
    file_path = Path(relative_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved resume file could not be found",
        )

    parsed = parse_resume(file_path)
    preview = parsed.text[:500].strip()
    return {
        "message": "Saved resume loaded successfully",
        "resume_url": current_user.resume_url,
        "extracted_text": parsed.text,
        "extracted_text_preview": preview,
        "extracted_skills": parsed.skills,
        "inferred_profile": {
            "full_name": parsed.full_name,
            "email": parsed.email,
            "phone": parsed.phone,
            "summary": parsed.summary,
            "education": parsed.education,
            "experience_years": parsed.experience_years,
            "preferred_role": parsed.inferred_role,
        },
        "user": current_user,
    }
