from app.models.job import Job
from app.models.user import User


COMMON_SKILLS = {
    "api",
    "aws",
    "azure",
    "css",
    "django",
    "docker",
    "excel",
    "fastapi",
    "flask",
    "git",
    "html",
    "java",
    "javascript",
    "mongodb",
    "nlp",
    "numpy",
    "pandas",
    "postgresql",
    "power bi",
    "python",
    "react",
    "rest api",
    "scikit-learn",
    "scrapy",
    "selenium",
    "sql",
    "tableau",
    "typescript",
    "vue",
}


def split_skills(value: str | None) -> set[str]:
    if not value:
        return set()
    normalized = value.replace("/", ",").replace("|", ",")
    return {part.strip().lower() for part in normalized.split(",") if part.strip()}


def extract_known_skills(text: str) -> list[str]:
    lowered = text.lower()
    return sorted(skill for skill in COMMON_SKILLS if skill in lowered)


def score_job_for_user(job: Job, user: User, resume_skills: set[str] | None = None) -> tuple[float, list[str], list[str]]:
    score = 0.0
    reasons: list[str] = []
    user_skills = split_skills(user.skills)
    job_skills = split_skills(job.skills)

    matched_skills = sorted(job_skills.intersection(user_skills))
    if resume_skills:
        matched_skills = sorted(set(matched_skills).union(job_skills.intersection(resume_skills)))

    if matched_skills:
        score += min(len(matched_skills) * 18, 54)
        reasons.append("Matches profile or resume skills")

    if user.preferred_location and user.preferred_location.lower() in job.location.lower():
        score += 22
        reasons.append("Matches preferred location")

    if user.preferred_role and user.preferred_role.lower() in job.title.lower():
        score += 24
        reasons.append("Matches preferred role")

    if not reasons:
        score = 10
        reasons.append("Active posting you may want to review")

    return min(score, 100), matched_skills, reasons
