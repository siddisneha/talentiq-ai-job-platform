from datetime import datetime

from pydantic import BaseModel


class JobBase(BaseModel):
    title: str
    company: str
    location: str
    job_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    skills: str | None = None
    description: str
    source_url: str | None = None
    external_id: str | None = None
    source_name: str | None = None
    source_id: int | None = None
    expires_at: datetime | None = None


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: str | None = None
    company: str | None = None
    location: str | None = None
    job_type: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    skills: str | None = None
    description: str | None = None
    source_url: str | None = None
    external_id: str | None = None
    source_name: str | None = None
    source_id: int | None = None
    is_active: bool | None = None
    expires_at: datetime | None = None


class JobRead(JobBase):
    id: int
    is_active: bool
    expires_at: datetime | None
    posted_by_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
