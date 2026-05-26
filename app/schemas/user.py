from datetime import datetime

from pydantic import BaseModel, EmailStr

USER_ROLES = {"candidate", "employer", "admin"}
PUBLIC_USER_ROLES = {"candidate", "employer"}


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: str = "candidate"
    phone: str | None = None
    headline: str | None = None
    summary: str | None = None
    skills: str | None = None
    experience_years: str | None = None
    education: str | None = None
    current_location: str | None = None
    preferred_location: str | None = None
    preferred_branch: str | None = None
    preferred_role: str | None = None
    preferred_job_type: str | None = None
    expected_salary: str | None = None
    notice_period: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    headline: str | None = None
    summary: str | None = None
    skills: str | None = None
    experience_years: str | None = None
    education: str | None = None
    current_location: str | None = None
    preferred_location: str | None = None
    preferred_branch: str | None = None
    preferred_role: str | None = None
    preferred_job_type: str | None = None
    expected_salary: str | None = None
    notice_period: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None
    resume_url: str | None = None


class UserRead(UserBase):
    id: int
    resume_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeParseResult(BaseModel):
    message: str
    resume_url: str
    extracted_text: str
    extracted_text_preview: str
    extracted_skills: list[str]
    inferred_profile: dict[str, str | None]
    user: UserRead
