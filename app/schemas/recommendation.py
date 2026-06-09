from pydantic import BaseModel

from app.schemas.job import JobRead
from app.schemas.user import UserRead


class ResumeMatchRequest(BaseModel):
    resume_text: str


class JobRecommendation(BaseModel):
    job: JobRead
    score: float
    matched_skills: list[str]
    reasons: list[str]
    explanation: str | None = None


class ResumeMatchResponse(BaseModel):
    extracted_skills: list[str]
    recommendations: list[JobRecommendation]


class AIJobRequest(BaseModel):
    job_id: int
    resume_text: str | None = None


class AIResumeTextRequest(BaseModel):
    resume_text: str


class CareerCoachRequest(BaseModel):
    question: str
    resume_text: str | None = None


class AIReviewResponse(BaseModel):
    resume_score: int
    strengths: list[str]
    improvements: list[str]
    extracted_skills: list[str]


class SkillGapResponse(BaseModel):
    match_score: int
    job_requirements: list[str]
    user_skills: list[str]
    missing_skills: list[str]
    matched_skills: list[str]


class MatchExplanationResponse(BaseModel):
    match_score: int
    why_this_matches: list[str]
    missing: list[str]


class InterviewQuestionsResponse(BaseModel):
    skills: list[str]
    questions: list[str]


class CareerCoachResponse(BaseModel):
    answer: str
    recommended_focus: list[str]


class LearningRoadmapResponse(BaseModel):
    current_level: str
    next_steps: list[str]
    estimated_timeline: str


class JobSimplifierResponse(BaseModel):
    required: list[str]
    simplified: str


class CoverLetterResponse(BaseModel):
    draft: str


class ResumeTailoringResponse(BaseModel):
    suggestions: list[dict[str, str]]


class RecruiterAIResponse(BaseModel):
    candidate: UserRead
    strengths: list[str]
    weaknesses: list[str]
    overall_fit: int
