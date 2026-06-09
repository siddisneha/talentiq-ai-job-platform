from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.application import Application
from app.models.job import Job
from app.models.user import User
from app.schemas.recommendation import (
    AIJobRequest,
    AIResumeTextRequest,
    CareerCoachRequest,
    CareerCoachResponse,
    CoverLetterResponse,
    InterviewQuestionsResponse,
    JobRecommendation,
    JobSimplifierResponse,
    LearningRoadmapResponse,
    MatchExplanationResponse,
    RecruiterAIResponse,
    ResumeMatchRequest,
    ResumeMatchResponse,
    ResumeTailoringResponse,
    AIReviewResponse,
    SkillGapResponse,
)
from app.services.recommendations import extract_known_skills, focused_jobs_for_user, score_job_for_user
from app.services.ml_recommendations import recommend_jobs_ml
from app.services.llm_assistant import (
    analyze_skill_gap,
    career_coach_answer,
    explain_match,
    generate_cover_letter,
    generate_interview_questions,
    generate_match_insights,
    learning_roadmap,
    llm_enabled,
    recruiter_candidate_summary,
    review_resume,
    simplify_job,
    tailor_resume,
)
from app.services.resume_parser import extract_skills as extract_resume_skills

router = APIRouter()


def _active_job(db: Session, job_id: int) -> Job:
    job = db.get(Job, job_id)
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _require_recruiter(current_user: User) -> None:
    if current_user.role not in {"employer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employer or admin accounts can use recruiter AI",
        )


@router.get("/", response_model=list[JobRecommendation])
def recommended_jobs(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs = db.query(Job).filter(Job.is_active.is_(True)).order_by(Job.created_at.desc()).limit(3000).all()
    focused_jobs = focused_jobs_for_user(jobs, current_user)
    if current_user.preferred_branch and not focused_jobs:
        return []
    jobs = (focused_jobs if focused_jobs else jobs)[:120]
    ml_recommendations = recommend_jobs_ml(current_user, jobs, top_n=None)
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
        if current_user.preferred_branch and final_score < 25:
            continue
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
    jobs = db.query(Job).filter(Job.is_active.is_(True)).order_by(Job.created_at.desc()).limit(3000).all()
    focused_jobs = focused_jobs_for_user(jobs, current_user)
    if current_user.preferred_branch and not focused_jobs:
        return {"extracted_skills": extracted_skills, "recommendations": []}
    jobs = (focused_jobs if focused_jobs else jobs)[:120]
    recommendations = []
    for job in jobs:
        score, matched_skills, reasons = score_job_for_user(job, current_user, resume_skills)
        llm_signal = generate_match_insights(current_user, job, matched_skills, score) if llm_enabled() else None
        if llm_signal:
            score = min(score + (llm_signal["semantic_fit"] * 12) + (llm_signal["skill_overlap"] * 8), 100)
        if current_user.preferred_branch and score < 25:
            continue
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


@router.post("/ai/resume-review", response_model=AIReviewResponse)
def ai_resume_review(
    payload: AIResumeTextRequest,
    current_user: User = Depends(get_current_user),
):
    return review_resume(current_user, payload.resume_text)


@router.post("/ai/skill-gap", response_model=SkillGapResponse)
def ai_skill_gap(
    payload: AIJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return analyze_skill_gap(current_user, _active_job(db, payload.job_id), payload.resume_text)


@router.post("/ai/match-explanation", response_model=MatchExplanationResponse)
def ai_match_explanation(
    payload: AIJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return explain_match(current_user, _active_job(db, payload.job_id), payload.resume_text)


@router.post("/ai/interview-questions", response_model=InterviewQuestionsResponse)
def ai_interview_questions(
    payload: AIJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return generate_interview_questions(current_user, _active_job(db, payload.job_id), payload.resume_text)


@router.post("/ai/career-coach", response_model=CareerCoachResponse)
def ai_career_coach(
    payload: CareerCoachRequest,
    current_user: User = Depends(get_current_user),
):
    return career_coach_answer(current_user, payload.question, payload.resume_text)


@router.post("/ai/learning-roadmap", response_model=LearningRoadmapResponse)
def ai_learning_roadmap(
    payload: AIResumeTextRequest,
    current_user: User = Depends(get_current_user),
):
    return learning_roadmap(current_user, payload.resume_text)


@router.post("/ai/job-simplifier", response_model=JobSimplifierResponse)
def ai_job_simplifier(
    payload: AIJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return simplify_job(_active_job(db, payload.job_id))


@router.post("/ai/cover-letter", response_model=CoverLetterResponse)
def ai_cover_letter(
    payload: AIJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return generate_cover_letter(current_user, _active_job(db, payload.job_id), payload.resume_text)


@router.post("/ai/resume-tailoring", response_model=ResumeTailoringResponse)
def ai_resume_tailoring(
    payload: AIJobRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return tailor_resume(current_user, _active_job(db, payload.job_id), payload.resume_text)


@router.get("/ai/recruiter/applications/{application_id}", response_model=RecruiterAIResponse)
def ai_recruiter_summary(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_recruiter(current_user)
    query = db.query(Application).join(Job, Application.job_id == Job.id).filter(Application.id == application_id)
    if current_user.role != "admin":
        query = query.filter(Job.posted_by_id == current_user.id)
    application = query.first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    summary = recruiter_candidate_summary(application.user, application.job)
    return {
        "candidate": application.user,
        "strengths": summary["strengths"],
        "weaknesses": summary["weaknesses"],
        "overall_fit": summary["overall_fit"],
    }
