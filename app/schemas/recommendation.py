from pydantic import BaseModel

from app.schemas.job import JobRead


class ResumeMatchRequest(BaseModel):
    resume_text: str


class JobRecommendation(BaseModel):
    job: JobRead
    score: float
    matched_skills: list[str]
    reasons: list[str]


class ResumeMatchResponse(BaseModel):
    extracted_skills: list[str]
    recommendations: list[JobRecommendation]
