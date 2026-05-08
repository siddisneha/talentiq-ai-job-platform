from datetime import datetime

from pydantic import BaseModel

from app.schemas.job import JobRead


class SavedJobRead(BaseModel):
    id: int
    job_id: int
    created_at: datetime
    job: JobRead

    model_config = {"from_attributes": True}

