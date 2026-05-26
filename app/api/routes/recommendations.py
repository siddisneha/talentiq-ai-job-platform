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
from app.services.recommendations import extract_known_skills, focused_jobs_for_user, score_job_for_user
from app.services.ml_recommendations import recommend_jobs_ml
from app.services.llm_assistant import generate_match_insights, llm_enabled
from app.services.resume_parser import extract_skills as extract_resume_skills

router = APIRouter()


@router.get("/", response_model=list[JobRecommendation])
def recommended_jobs(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(Job).filter(Job.is_active.is_(True)).order_by(Job.created_at.desc()).limit(300).all()
    jobs = focused_jobs_for_user(jobs, current_user)[:120]
    ml_recommendations = recommend_jobs_ml(current_user, jobs)
    ml_score_map = {item["job_id"]: item["score"] for item in ml_recommendations}
    recommendations = []
    for job in jobs:
        rule_score, matched_skills, reasons = score_job_for_user(job, current_user)
        ml_score = ml_score_map.get(job.id, 0)
        hybrid_score = (rule_score * 0.6) + (ml_score * 0.4)
        llm_signal = generate_match_insights(current_user, job, matched_skills, hybrid_score) if llm_enabled() else None
        llm_bonus = 0
        if llm_signal:
            llm_bonus = (llm_signal["semantic_fit"] * 18) + (llm_signal["skill_overlap"] * 14) + (llm_signal["experience_fit"] * 8)
        final_score = min((rule_score * 0.5) + (ml_score * 0.3) + llm_bonus, 100)
        explanation = llm_signal["explanation"] if llm_signal else None
        recommendations.append(
            {
                "job": job,
                "score": round(final_score,2),
                "matched_skills": matched_skills,
                "reasons": reasons,
                "explanation": explanation,
                "llm_signal": llm_signal,
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
    extracted_skills = sorted(
        set(extract_resume_skills(payload.resume_text)).union(extract_known_skills(payload.resume_text))
    )
    resume_skills = set(extracted_skills)
    jobs = db.query(Job).filter(Job.is_active.is_(True)).order_by(Job.created_at.desc()).limit(300).all()
    jobs = focused_jobs_for_user(jobs, current_user)[:120]
    recommendations = []
    for job in jobs:
        score, matched_skills, reasons = score_job_for_user(job, current_user, resume_skills)
        llm_signal = generate_match_insights(current_user, job, matched_skills, score) if llm_enabled() else None
        if llm_signal:
            score = min(score + (llm_signal["semantic_fit"] * 12) + (llm_signal["skill_overlap"] * 8), 100)
        recommendations.append(
            {
                "job": job,
                "score": score,
                "matched_skills": matched_skills,
                "reasons": reasons,
                "explanation": llm_signal["explanation"] if llm_signal else None,
                "llm_signal": llm_signal,
            }
        )

    recommendations.sort(key=lambda item: item["score"], reverse=True)
    return {"extracted_skills": extracted_skills, "recommendations": recommendations[:10]}
