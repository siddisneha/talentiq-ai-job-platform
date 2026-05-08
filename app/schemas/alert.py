from datetime import datetime

from pydantic import BaseModel

from app.schemas.job import JobRead


class JobAlertBase(BaseModel):
    name: str
    keyword: str | None = None
    location: str | None = None
    skill: str | None = None
    minimum_salary: int | None = None


class JobAlertCreate(JobAlertBase):
    pass


class JobAlertUpdate(BaseModel):
    name: str | None = None
    keyword: str | None = None
    location: str | None = None
    skill: str | None = None
    minimum_salary: int | None = None
    is_active: bool | None = None


class JobAlertRead(JobAlertBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class JobAlertMatches(BaseModel):
    alert: JobAlertRead
    matches: list[JobRead]
