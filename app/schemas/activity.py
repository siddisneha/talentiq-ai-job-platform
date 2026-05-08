from datetime import datetime

from pydantic import BaseModel


class ActivityCreate(BaseModel):
    event_type: str
    job_id: int | None = None
    search_query: str | None = None
    metadata_json: str | None = None


class ActivityRead(ActivityCreate):
    id: int
    user_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
