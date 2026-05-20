from pydantic import BaseModel


class NamedCount(BaseModel):
    name: str
    count: int


class SalaryRangeInsight(BaseModel):
    minimum: int | None
    maximum: int | None
    average_minimum: float | None
    average_maximum: float | None


class AnalyticsSummary(BaseModel):
    total_users: int
    active_jobs: int
    total_applications: int
    total_saved_jobs: int
    total_activity_events: int
    applications_per_job: list[NamedCount]
    top_roles: list[NamedCount]
    top_locations: list[NamedCount]
    top_skills: list[NamedCount]
    salary_ranges: SalaryRangeInsight
    application_statuses: list[NamedCount]
    user_skills: list[str]
    missing_skills: list[str]
