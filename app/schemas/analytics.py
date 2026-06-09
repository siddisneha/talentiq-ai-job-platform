from pydantic import BaseModel


class NamedCount(BaseModel):
    name: str
    count: int


class SalaryRangeInsight(BaseModel):
    minimum: int | None
    maximum: int | None
    average_minimum: float | None
    average_maximum: float | None


class ForecastPoint(BaseModel):
    date: str
    predicted_count: int


class JobTrendPrediction(BaseModel):
    forecast: list[ForecastPoint]
    trend_direction: str
    top_growth_roles: list[NamedCount]
    top_growth_skills: list[NamedCount]


class EngagementPrediction(BaseModel):
    score: float
    segment: str
    profile_completion: int
    next_action: str


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
    job_trend_prediction: JobTrendPrediction
    engagement_prediction: EngagementPrediction


class RecruiterMetric(BaseModel):
    name: str
    value: int


class RecruiterJobInsight(BaseModel):
    job_id: int
    title: str
    company: str
    applications: int


class RecruiterDashboardSummary(BaseModel):
    total_jobs: int
    active_jobs: int
    closed_jobs: int
    total_applications: int
    recent_applications: int
    top_jobs: list[RecruiterJobInsight]
    applicant_skills: list[NamedCount]
    job_statuses: list[NamedCount]
