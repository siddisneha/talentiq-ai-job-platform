from pydantic import BaseModel

from app.schemas.job import JobRead


class DashboardSummary(BaseModel):
    user_name: str
    saved_jobs_count: int
    applications_count: int
    active_jobs_count: int
    alerts_count: int
    recent_activity_count: int
    recommended_jobs: list[JobRead]
