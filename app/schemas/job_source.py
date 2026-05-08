from datetime import datetime

from pydantic import BaseModel


class JobSourceBase(BaseModel):
    name: str
    source_type: str = "manual"
    base_url: str | None = None


class JobSourceCreate(JobSourceBase):
    pass


class JobSourceUpdate(BaseModel):
    name: str | None = None
    source_type: str | None = None
    base_url: str | None = None
    is_active: bool | None = None


class JobSourceRead(JobSourceBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
