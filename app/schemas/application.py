from datetime import datetime

from pydantic import BaseModel

from app.schemas.job import JobRead
from app.schemas.user import UserRead


class ApplicationCreate(BaseModel):
    job_id: int
    status: str = "applied"
    cover_letter: str | None = None
    resume_url: str | None = None


class ApplicationUpdate(BaseModel):
    status: str | None = None
    cover_letter: str | None = None
    resume_url: str | None = None


class ApplicationRead(BaseModel):
    id: int
    job_id: int
    status: str
    cover_letter: str | None
    resume_url: str | None
    created_at: datetime
    updated_at: datetime
    job: JobRead

    model_config = {"from_attributes": True}


class EmployerApplicationRead(ApplicationRead):
    user: UserRead
