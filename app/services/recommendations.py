import re

from app.models.job import Job
from app.models.user import User
from app.services.role_packs import BRANCH_ROLE_PACKS, branch_search_terms, normalize_branch_key


BRANCH_SKILLS = {
    "data_ai": {
        "excel",
        "sql",
        "python",
        "statistics",
        "power bi",
        "tableau",
        "data visualization",
        "pandas",
        "numpy",
        "machine learning",
        "scikit-learn",
        "etl",
        "spark",
        "snowflake",
        "bigquery",
    },
    "cse_it": {
        "python",
        "java",
        "javascript",
        "react",
        "node.js",
        "fastapi",
        "django",
        "sql",
        "postgresql",
        "mongodb",
        "git",
        "docker",
        "aws",
        "azure",
        "rest api",
        "testing",
    },
    "ece": {
        "embedded c",
        "microcontrollers",
        "arduino",
        "raspberry pi",
        "rtos",
        "iot",
        "vlsi",
        "verilog",
        "systemverilog",
        "fpga",
        "pcb design",
        "cadence",
        "matlab",
        "signal processing",
        "telecommunications",
        "rf",
        "analog electronics",
        "digital electronics",
    },
    "eee": {
        "power systems",
        "electrical design",
        "autocad electrical",
        "plc",
        "scada",
        "matlab",
        "simulink",
        "control systems",
        "power electronics",
        "renewable energy",
        "solar pv",
        "substation",
        "protection relays",
        "motor control",
        "automation",
        "maintenance",
        "load flow analysis",
        "etap",
    },
    "mechanical": {
        "solidworks",
        "autocad",
        "catia",
        "ansys",
        "cad",
        "cam",
        "manufacturing",
        "gd&t",
        "quality control",
        "production planning",
        "maintenance",
        "thermal engineering",
    },
    "civil": {
        "autocad",
        "staad pro",
        "revit",
        "etabs",
        "structural analysis",
        "quantity surveying",
        "construction management",
        "site execution",
        "estimation",
        "project planning",
    },
    "business": {
        "excel",
        "power bi",
        "sql",
        "market research",
        "stakeholder management",
        "requirements gathering",
        "process mapping",
        "jira",
        "agile",
        "product analytics",
    },
}

BRANCH_CORE_TERMS = {
    "ece": {"ece", "electronics", "semiconductor", "vlsi", "embedded"},
    "eee": {"eee", "electrical", "power systems", "power electronics"},
    "mechanical": {"mechanical", "manufacturing", "thermal", "hvac"},
    "civil": {"civil", "construction", "structural"},
}

COMMON_SKILLS = {
    "api",
    "aws",
    "azure",
    "bigquery",
    "business intelligence",
    "css",
    "data analysis",
    "data analytics",
    "data visualization",
    "databricks",
    "django",
    "docker",
    "etl",
    "excel",
    "fastapi",
    "flask",
    "git",
    "hadoop",
    "html",
    "java",
    "javascript",
    "looker",
    "machine learning",
    "matplotlib",
    "mongodb",
    "nlp",
    "numpy",
    "pandas",
    "postgresql",
    "power bi",
    "power query",
    "python",
    "react",
    "rest api",
    "scikit-learn",
    "scrapy",
    "seaborn",
    "selenium",
    "snowflake",
    "spark",
    "sql",
    "statistics",
    "tableau",
    "typescript",
    "vue",
}.union(*(skills for skills in BRANCH_SKILLS.values()))

SKILL_PATTERNS = {
    skill: re.compile(rf"(?<![a-z0-9+#.]){re.escape(skill)}(?![a-z0-9+#.])")
    for skill in COMMON_SKILLS
}


def split_skills(value: str | None) -> set[str]:
    if not value:
        return set()
    normalized = value.replace("/", ",").replace("|", ",")
    return {part.strip().lower() for part in normalized.split(",") if part.strip()}


def extract_known_skills(text: str) -> list[str]:
    lowered = text.lower()[:5000]
    return sorted(skill for skill, pattern in SKILL_PATTERNS.items() if pattern.search(lowered))


def user_branch_key(user: User) -> str | None:
    if not user.preferred_branch:
        return None
    branch_key = normalize_branch_key(user.preferred_branch)
    return branch_key if branch_key in BRANCH_ROLE_PACKS else None


def branch_roles(branch_key: str | None) -> list[str]:
    if not branch_key:
        return []
    return list(BRANCH_ROLE_PACKS.get(branch_key, {}).get("roles", []))


def branch_skills(branch_key: str | None) -> set[str]:
    if not branch_key:
        return set()
    return set(BRANCH_SKILLS.get(branch_key, set()))


def job_text(job: Job) -> str:
    return " ".join([job.title or "", job.company or "", job.skills or "", job.description or ""]).lower()


def job_focus_text(job: Job) -> str:
    return " ".join([job.title or "", job.skills or ""]).lower()


def term_matches(text: str, term: str) -> bool:
    return re.search(rf"(?<![a-z0-9+#.]){re.escape(term)}(?![a-z0-9+#.])", text) is not None


def branch_relevance_score(job: Job, user: User, resume_skills: set[str] | None = None) -> int:
    branch_key = user_branch_key(user)
    if not branch_key:
        return 0
    text = job_focus_text(job)
    title = (job.title or "").lower()
    if branch_key in {"ece", "eee", "mechanical", "civil"} and any(
        term_matches(title, term)
        for term in (
            "ai",
            "analyst",
            "backend",
            "data",
            "datos",
            "developer",
            "full-stack",
            "inference",
            "lead full-stack",
            "operaciones",
            "operations",
            "python software",
            "qa",
            "rails",
            "software engineer",
            "tech lead",
            "web",
        )
    ):
        if not any(
            term_matches(title, term)
            for term in (
                "civil",
                "electrical",
                "electronics",
                "embedded",
                "fpga",
                "hardware design",
                "mechanical",
                "power systems",
                "rtl",
                "semiconductor",
                "vlsi",
            )
        ):
            return 0
    role_terms = [role.lower() for role in branch_roles(branch_key)]
    search_terms = [term.lower() for term in branch_search_terms(branch_key)]
    job_skills = set(extract_known_skills(text)).union(split_skills(job.skills or ""))
    user_terms = split_skills(user.skills or "").union(resume_skills or set())
    relevance = 0
    relevance += sum(1 for term in BRANCH_CORE_TERMS.get(branch_key, set()) if term_matches(title, term)) * 3
    relevance += sum(1 for term in role_terms if term_matches(text, term)) * 3
    relevance += sum(1 for term in search_terms if term_matches(text, term)) * 2
    relevance += len(job_skills.intersection(branch_skills(branch_key))) * 2
    relevance += len(job_skills.intersection(user_terms)) * 3
    return relevance


def job_matches_profile_focus(job: Job, user: User) -> bool:
    text = job_focus_text(job)
    preferred_role = (user.preferred_role or "").strip().lower()
    if preferred_role and term_matches(text, preferred_role):
        return True

    return branch_relevance_score(job, user) >= 3


def focused_jobs_for_user(jobs: list[Job], user: User) -> list[Job]:
    if not user.preferred_role and not user.preferred_branch:
        return jobs
    focused = [job for job in jobs if job_matches_profile_focus(job, user)]
    return focused


def skills_for_user_focus(user: User) -> set[str]:
    skills = branch_skills(user_branch_key(user))
    preferred_role = (user.preferred_role or "").lower()
    if "data analyst" in preferred_role or "business analyst" in preferred_role:
        skills.update(BRANCH_SKILLS["data_ai"])
    if "software" in preferred_role or "developer" in preferred_role:
        skills.update(BRANCH_SKILLS["cse_it"])
    if "electrical" in preferred_role or "power" in preferred_role:
        skills.update(BRANCH_SKILLS["eee"])
    if "embedded" in preferred_role or "vlsi" in preferred_role or "electronics" in preferred_role:
        skills.update(BRANCH_SKILLS["ece"])
    return skills


def score_job_for_user(job: Job, user: User, resume_skills: set[str] | None = None) -> tuple[float, list[str], list[str]]:
    score = 0.0
    reasons: list[str] = []
    user_skills = split_skills(user.skills)
    job_skills = split_skills(job.skills).union(extract_known_skills(job_text(job)))

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

    branch_key = user_branch_key(user)
    if branch_key and job_matches_profile_focus(job, user):
        score += 28
        reasons.append(f"Matches {BRANCH_ROLE_PACKS[branch_key]['label']} profile")
    elif branch_key:
        relevance = branch_relevance_score(job, user, resume_skills)
        if relevance:
            score += min(relevance * 4, 28)
            reasons.append(f"Related to {BRANCH_ROLE_PACKS[branch_key]['label']} profile")

    if not reasons:
        score = 10
        reasons.append("Active posting you may want to review")

    return min(score, 100), matched_skills, reasons
