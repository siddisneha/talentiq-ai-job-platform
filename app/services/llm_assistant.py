from __future__ import annotations

import os
import json
from functools import lru_cache

from app.core.config import settings
from app.models.job import Job
from app.models.user import User
from app.services.recommendations import extract_known_skills, split_skills
from app.services.resume_parser import extract_skills as extract_resume_skills


@lru_cache(maxsize=1)
def _openai_client():
    api_key = settings.openai_api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
    except Exception:
        return None
    return OpenAI(api_key=api_key)


def llm_enabled() -> bool:
    return _openai_client() is not None


def _clip(text: str | None, limit: int = 1200) -> str:
    value = (text or "").strip()
    return value[:limit]


def _json_completion(prompt: str, fallback: dict[str, object]) -> dict[str, object]:
    client = _openai_client()
    if client is None:
        return fallback
    try:
        response = client.responses.create(
            model=settings.openai_model or os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            input=prompt.strip(),
        )
        text = getattr(response, "output_text", "") or ""
        parsed = json.loads(text)
        return {**fallback, **parsed} if isinstance(parsed, dict) else fallback
    except Exception:
        return fallback


def _skills_from_text(text: str | None) -> list[str]:
    return sorted(set(extract_resume_skills(text or "")).union(extract_known_skills(text or "")).union(split_skills(text)))


def _user_skills(user: User, resume_text: str | None = None) -> list[str]:
    profile_text = " ".join(
        [
            user.skills or "",
            user.summary or "",
            user.headline or "",
            user.preferred_role or "",
            resume_text or "",
        ]
    )
    return _skills_from_text(profile_text)


def _job_skills(job: Job) -> list[str]:
    return _skills_from_text(" ".join([job.title or "", job.skills or "", job.description or ""]))


def analyze_skill_gap(user: User, job: Job, resume_text: str | None = None) -> dict[str, object]:
    job_requirements = _job_skills(job)
    user_skills = _user_skills(user, resume_text)
    matched = sorted(set(job_requirements).intersection(user_skills))
    missing = sorted(set(job_requirements).difference(user_skills))
    if job_requirements:
        score = int(round((len(matched) / len(job_requirements)) * 100))
    else:
        score = 65 if user_skills else 45
    if user.preferred_role and user.preferred_role.lower() in (job.title or "").lower():
        score = min(score + 12, 100)
    if user.preferred_location and user.preferred_location.lower() in (job.location or "").lower():
        score = min(score + 6, 100)
    return {
        "match_score": score,
        "job_requirements": job_requirements,
        "user_skills": user_skills,
        "missing_skills": missing,
        "matched_skills": matched,
    }


def review_resume(user: User, resume_text: str) -> dict[str, object]:
    skills = _skills_from_text(resume_text)
    lower = resume_text.lower()
    strengths = []
    improvements = []
    if skills:
        strengths.append(f"Strong skills section with {', '.join(skills[:4])}")
    if any(term in lower for term in ("project", "projects", "built", "developed")):
        strengths.append("Good project section")
    if any(term in lower for term in ("sql", "python", "fastapi", "power bi")):
        strengths.append("Relevant technical experience")
    if not any(term in lower for term in ("certification", "certified")):
        improvements.append("Add certifications")
    if not any(char.isdigit() for char in resume_text):
        improvements.append("Quantify achievements")
    if len((user.summary or "").strip()) < 80 and "summary" not in lower:
        improvements.append("Improve summary section")

    score = 50 + min(len(skills) * 5, 30) + min(len(strengths) * 5, 15) - min(len(improvements) * 4, 15)
    fallback = {
        "resume_score": max(35, min(score, 100)),
        "strengths": strengths or ["Clear resume structure"],
        "improvements": improvements or ["Add more measurable impact statements"],
        "extracted_skills": skills,
    }
    return _json_completion(
        f"""
Return valid JSON only with keys resume_score, strengths, improvements, extracted_skills.
Review this resume for a job portal candidate.
Candidate role: {_clip(user.preferred_role, 120) or 'not set'}
Candidate skills: {_clip(user.skills, 400) or 'not set'}
Resume: {_clip(resume_text, 3500)}
""",
        fallback,
    )


def explain_match(user: User, job: Job, resume_text: str | None = None) -> dict[str, object]:
    gap = analyze_skill_gap(user, job, resume_text)
    matched = list(gap["matched_skills"])
    missing = list(gap["missing_skills"])
    fallback = {
        "match_score": gap["match_score"],
        "why_this_matches": [f"{skill} skills align well" for skill in matched[:4]]
        or [f"{job.title} aligns with your preferred role or profile focus"],
        "missing": missing[:6],
    }
    return _json_completion(
        f"""
Return valid JSON only with keys match_score, why_this_matches, missing.
Explain why this candidate matches this job in short bullet-ready phrases.
Candidate: {_clip(user.skills, 600)} {_clip(user.summary, 600)}
Job: {job.title} at {job.company}. Skills: {_clip(job.skills, 500)}. Description: {_clip(job.description, 1600)}
Matched skills: {', '.join(matched) or 'none'}
Missing skills: {', '.join(missing) or 'none'}
""",
        fallback,
    )


def generate_interview_questions(user: User, job: Job, resume_text: str | None = None) -> dict[str, object]:
    skills = sorted(set(_job_skills(job)[:8]).union(_user_skills(user, resume_text)[:6]))[:8]
    question_bank = {
        "python": "Explain Python decorators and when you would use them.",
        "sql": "What is the difference between JOIN and UNION?",
        "fastapi": "What is FastAPI dependency injection?",
        "power bi": "Explain Power BI DAX and a measure you have written.",
        "tableau": "How would you build a dashboard for executive reporting in Tableau?",
        "aws": "How would you deploy and monitor an application on AWS?",
    }
    fallback_questions = [question_bank.get(skill.lower(), f"How have you used {skill} in a real project?") for skill in skills[:8]]
    fallback = {"skills": skills, "questions": fallback_questions}
    return _json_completion(
        f"""
Return valid JSON only with keys skills and questions.
Generate practical interview questions for this candidate and job.
Candidate skills: {_clip(user.skills, 500)}
Job title: {job.title}
Job skills: {_clip(job.skills, 500)}
Description: {_clip(job.description, 1200)}
""",
        fallback,
    )


def career_coach_answer(user: User, question: str, resume_text: str | None = None) -> dict[str, object]:
    skills = _user_skills(user, resume_text)
    target = user.preferred_role or "your target role"
    focus = [skill for skill in ("statistics", "machine learning", "tableau", "aws", "projects") if skill not in {s.lower() for s in skills}]
    fallback = {
        "answer": (
            f"To move toward {target}, build from your current skills ({', '.join(skills[:5]) or 'profile basics'}), "
            "choose one portfolio project, and close the most visible missing skills first."
        ),
        "recommended_focus": focus[:5] or ["portfolio projects", "interview practice", "measurable resume achievements"],
    }
    return _json_completion(
        f"""
Return valid JSON only with keys answer and recommended_focus.
Act as a concise career coach for this Avenir candidate.
Question: {_clip(question, 700)}
Profile: role={_clip(user.preferred_role, 120)}, skills={_clip(user.skills, 600)}, summary={_clip(user.summary, 900)}
Resume: {_clip(resume_text, 2200)}
""",
        fallback,
    )


def learning_roadmap(user: User, resume_text: str | None = None) -> dict[str, object]:
    skills = {skill.lower() for skill in _user_skills(user, resume_text)}
    if {"python", "sql"}.intersection(skills) and {"power bi", "tableau"}.intersection(skills):
        level = "Junior Data Analyst"
    elif {"python", "fastapi"}.intersection(skills):
        level = "Junior Backend Developer"
    else:
        level = "Early Career Candidate"
    next_steps = [skill.title() for skill in ("tableau", "statistics", "machine learning", "aws") if skill not in skills]
    fallback = {
        "current_level": level,
        "next_steps": next_steps[:5] or ["Build one advanced portfolio project", "Practice system design basics"],
        "estimated_timeline": "6 months",
    }
    return _json_completion(
        f"""
Return valid JSON only with keys current_level, next_steps, estimated_timeline.
Create a learning roadmap from this profile.
Preferred role: {_clip(user.preferred_role, 120)}
Skills: {_clip(user.skills, 700)}
Resume: {_clip(resume_text, 2200)}
""",
        fallback,
    )


def simplify_job(job: Job) -> dict[str, object]:
    required = _job_skills(job)
    fallback = {
        "required": required,
        "simplified": (
            f"You will work as a {job.title} at {job.company}, using "
            f"{', '.join(required[:4]) or 'the listed tools'} to deliver the main responsibilities in the job description."
        ),
    }
    return _json_completion(
        f"""
Return valid JSON only with keys required and simplified.
Simplify this job description for a student candidate.
Title: {job.title}
Company: {job.company}
Skills: {_clip(job.skills, 600)}
Description: {_clip(job.description, 2500)}
""",
        fallback,
    )


def generate_cover_letter(user: User, job: Job, resume_text: str | None = None) -> dict[str, object]:
    skills = _user_skills(user, resume_text)
    draft = (
        f"Dear Hiring Team,\n\nI am interested in the {job.title} role at {job.company}. "
        f"My background in {', '.join(skills[:5]) or 'relevant technical projects'} aligns with the role requirements, "
        "and I would welcome the opportunity to contribute to your team.\n\nSincerely,\n"
        f"{user.full_name}"
    )
    return _json_completion(
        f"""
Return valid JSON only with key draft.
Write a tailored, concise cover letter.
Candidate: {user.full_name}, skills={_clip(user.skills, 600)}, summary={_clip(user.summary, 900)}
Resume: {_clip(resume_text, 2200)}
Job: {job.title} at {job.company}, skills={_clip(job.skills, 600)}, description={_clip(job.description, 1800)}
""",
        {"draft": draft},
    )


def tailor_resume(user: User, job: Job, resume_text: str | None = None) -> dict[str, object]:
    gap = analyze_skill_gap(user, job, resume_text)
    suggestions = []
    for skill in list(gap["matched_skills"])[:4]:
        suggestions.append(
            {
                "current": f"Worked with {skill}",
                "suggested": f"Delivered measurable project outcomes using {skill} for {job.title}-aligned responsibilities.",
            }
        )
    for skill in list(gap["missing_skills"])[:3]:
        suggestions.append(
            {
                "current": f"{skill} not highlighted",
                "suggested": f"Add any coursework, project, or certification evidence for {skill} if truthful.",
            }
        )
    fallback = {"suggestions": suggestions or [{"current": "Project description", "suggested": "Add tools, scale, and measurable result."}]}
    return _json_completion(
        f"""
Return valid JSON only with key suggestions, where suggestions is a list of current/suggested objects.
Suggest truthful resume tailoring for this job.
Candidate profile: {_clip(user.skills, 700)} {_clip(user.summary, 900)}
Resume: {_clip(resume_text, 3000)}
Job: {job.title}, skills={_clip(job.skills, 600)}, description={_clip(job.description, 1800)}
""",
        fallback,
    )


def recruiter_candidate_summary(candidate: User, job: Job, resume_text: str | None = None) -> dict[str, object]:
    gap = analyze_skill_gap(candidate, job, resume_text)
    fallback = {
        "strengths": [f"{skill} experience" for skill in list(gap["matched_skills"])[:5]] or ["Relevant candidate profile"],
        "weaknesses": list(gap["missing_skills"])[:5],
        "overall_fit": gap["match_score"],
    }
    return _json_completion(
        f"""
Return valid JSON only with keys strengths, weaknesses, overall_fit.
Summarize this applicant for a recruiter.
Candidate: {candidate.full_name}, skills={_clip(candidate.skills, 700)}, summary={_clip(candidate.summary, 900)}
Job: {job.title}, skills={_clip(job.skills, 600)}, description={_clip(job.description, 1800)}
""",
        fallback,
    )


def _base_signal(score: float, matched_skills: list[str]) -> dict[str, object]:
    return {
        "semantic_fit": round(min(max(score, 0), 100) / 100, 2),
        "experience_fit": 0.5,
        "skill_overlap": round(min(len(matched_skills), 8) / 8, 2),
        "confidence": 0.55,
        "explanation": "",
    }


def generate_match_insights(user: User, job: Job, matched_skills: list[str], score: float) -> dict[str, object]:
    client = _openai_client()
    base = _base_signal(score, matched_skills)
    base["explanation"] = (
        f"{job.title} at {job.company} scored {score:.0f}/100 for {user.full_name}. "
        f"Matched skills: {', '.join(matched_skills) if matched_skills else 'none'}."
    )
    if client is None:
        return base

    prompt = f"""
You are an ATS recommendation engine.
Return valid JSON only with these keys:
- semantic_fit: number from 0 to 1
- experience_fit: number from 0 to 1
- skill_overlap: number from 0 to 1
- confidence: number from 0 to 1
- explanation: one concise sentence, plain text only

Candidate:
- role: {_clip(user.preferred_role, 140) or 'not set'}
- experience: {user.experience_years if user.experience_years is not None else 'not set'}
- skills: {_clip(user.skills, 500) or 'not set'}

Job:
- title: {_clip(job.title, 140)}
- company: {_clip(job.company, 140)}
- location: {_clip(job.location, 120)}
- skills: {_clip(job.skills, 500) or 'not set'}
- description: {_clip(job.description, 1000) or 'not set'}

Matched skills: {', '.join(matched_skills) if matched_skills else 'none'}
Current hybrid score: {score:.2f}
"""
    try:
        response = client.responses.create(
            model=settings.openai_model or os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            input=prompt.strip(),
        )
        text = getattr(response, "output_text", "") or ""
        parsed = json.loads(text)
        for key in ("semantic_fit", "experience_fit", "skill_overlap", "confidence"):
            if key in parsed:
                base[key] = round(float(parsed[key]), 2)
        explanation = str(parsed.get("explanation", "")).strip()
        if explanation:
            base["explanation"] = explanation
    except Exception:
        pass
    return base
