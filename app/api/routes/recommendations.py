from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.job import Job
from app.models.user import User
from app.schemas.recommendation import (
    JobRecommendation,
    ResumeMatchRequest,
    ResumeMatchResponse,
)
from app.services.recommendations import extract_known_skills, score_job_for_user

router = APIRouter()


@router.get("/", response_model=list[JobRecommendation])
def recommended_jobs(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(Job).filter(Job.is_active.is_(True)).all()
    recommendations = []
    for job in jobs:
        score, matched_skills, reasons = score_job_for_user(job, current_user)
        recommendations.append(
            {
                "job": job,
                "score": score,
                "matched_skills": matched_skills,
                "reasons": reasons,
            }
        )

    recommendations.sort(key=lambda item: item["score"], reverse=True)
    return recommendations[:limit]


@router.post("/resume-match", response_model=ResumeMatchResponse)
def resume_match(
    payload: ResumeMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    extracted_skills = extract_known_skills(payload.resume_text)
    resume_skills = set(extracted_skills)
    jobs = db.query(Job).filter(Job.is_active.is_(True)).all()
    recommendations = []
    for job in jobs:
        score, matched_skills, reasons = score_job_for_user(job, current_user, resume_skills)
        recommendations.append(
            {
                "job": job,
                "score": score,
                "matched_skills": matched_skills,
                "reasons": reasons,
            }
        )

    recommendations.sort(key=lambda item: item["score"], reverse=True)
    return {"extracted_skills": extracted_skills, "recommendations": recommendations[:10]}
