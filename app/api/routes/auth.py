from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.user import PUBLIC_USER_ROLES, UserCreate, UserRead

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.role not in PUBLIC_USER_ROLES:
        raise HTTPException(status_code=400, detail="Invalid user role")

    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email is already registered")

    user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        phone=user_in.phone,
        headline=user_in.headline,
        summary=user_in.summary,
        skills=user_in.skills,
        experience_years=user_in.experience_years,
        education=user_in.education,
        current_location=user_in.current_location,
        preferred_location=user_in.preferred_location,
        preferred_branch=user_in.preferred_branch,
        preferred_role=user_in.preferred_role,
        preferred_job_type=user_in.preferred_job_type,
        expected_salary=user_in.expected_salary,
        notice_period=user_in.notice_period,
        linkedin_url=user_in.linkedin_url,
        github_url=user_in.github_url,
        portfolio_url=user_in.portfolio_url,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(subject=str(user.id), expires_delta=expires_delta)
    return {"access_token": access_token, "token_type": "bearer"}
