from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import fitz
import spacy
from spacy.matcher import PhraseMatcher

try:
    from docx import Document  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    Document = None


try:
    nlp = spacy.load("en_core_web_sm")
except Exception:  # pragma: no cover - keep parser usable in lean envs
    nlp = spacy.blank("en")


KNOWN_SKILLS = [
    "python",
    "java",
    "c",
    "c++",
    "javascript",
    "typescript",
    "react",
    "node.js",
    "fastapi",
    "django",
    "flask",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "data analysis",
    "data analytics",
    "data visualization",
    "data science",
    "statistics",
    "power query",
    "dax",
    "etl",
    "data cleaning",
    "predictive modeling",
    "regression",
    "classification",
    "clustering",
    "pandas",
    "numpy",
    "scikit-learn",
    "sklearn",
    "tensorflow",
    "pytorch",
    "opencv",
    "nlp",
    "natural language processing",
    "computer vision",
    "generative ai",
    "llm",
    "power bi",
    "tableau",
    "excel",
    "advanced excel",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "github",
    "rest api",
    "api",
    "autocad",
    "solidworks",
    "catia",
    "embedded systems",
    "vlsi",
    "pcb design",
    "staad pro",
    "revit",
    "marketing",
    "sales",
    "business analysis",
    "recruitment",
    "talent acquisition",
]

matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
matcher.add("SKILLS", [nlp.make_doc(skill) for skill in KNOWN_SKILLS])

SECTION_HINTS = {
    "summary": {"summary", "profile", "about", "objective"},
    "education": {"education", "academic background", "academics"},
    "experience": {"experience", "work experience", "professional experience", "internship"},
    "projects": {"projects", "project experience"},
}

PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{8,}\d)")
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
NAME_HINT_RE = re.compile(r"^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$")
YEAR_RE = re.compile(r"(20\d{2}|19\d{2})")


def extract_text_from_file(file_path: str | Path) -> str:
    path = Path(file_path)
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf_text(path)
    if suffix == ".docx":
        return _extract_docx_text(path)
    if suffix == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")
    return path.read_text(encoding="utf-8", errors="ignore")


def _extract_pdf_text(file_path: Path) -> str:
    text = []
    with fitz.open(file_path) as pdf:
        for page in pdf:
            text.append(page.get_text())
    return "\n".join(text)


def _extract_docx_text(file_path: Path) -> str:
    if Document is None:
        raise RuntimeError("python-docx is not installed")
    doc = Document(str(file_path))
    return "\n".join(paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip())


def extract_skills(text: str) -> list[str]:
    doc = nlp(text[:20000])
    matches = matcher(doc)
    found = {doc[start:end].text.lower() for _, start, end in matches}
    return sorted(found)


def infer_full_name(text: str) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines[:8]:
        cleaned = re.sub(r"[^A-Za-z\s.]+", "", line).strip()
        if NAME_HINT_RE.match(cleaned) and len(cleaned.split()) <= 4:
            return cleaned
    return None


def infer_contact_details(text: str) -> dict[str, str | None]:
    email = EMAIL_RE.search(text)
    phone = PHONE_RE.search(text)
    return {
        "email": email.group(0) if email else None,
        "phone": phone.group(0).strip() if phone else None,
    }


def infer_summary(text: str) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return None

    lowered = [line.lower() for line in lines]
    for idx, line in enumerate(lowered):
        if line in {"about me", "summary", "profile", "objective"}:
            candidate = " ".join(lines[idx + 1 : idx + 4]).strip()
            if candidate:
                return re.sub(r"\s+", " ", candidate)[:180]

    candidate = " ".join(lines[:3]).strip()
    if not candidate:
        return None
    return re.sub(r"\s+", " ", candidate)[:180]


def infer_education(text: str) -> str | None:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    education_lines = []
    in_section = False
    for line in lines:
        lowered = line.lower()
        if any(hint in lowered for hint in SECTION_HINTS["education"]):
            in_section = True
            continue
        if in_section and any(hint in lowered for hint in SECTION_HINTS["experience"]):
            break
        if in_section:
            education_lines.append(line)
        if len(education_lines) >= 4:
            break
    return "\n".join(education_lines) if education_lines else None


def infer_experience_years(text: str) -> str | None:
    years = sorted({int(match.group(0)) for match in YEAR_RE.finditer(text)})
    if len(years) >= 2:
        span = years[-1] - years[0]
        if 0 <= span <= 40:
            return f"{max(span, 0)}+ years"
    return None


def infer_role_from_skills(skills: list[str]) -> str | None:
    skill_set = set(skills)
    if {"machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "sklearn", "nlp"} & skill_set:
        return "Machine Learning Engineer"
    if {"python", "sql", "pandas", "data analysis", "data analytics", "power bi", "excel"} & skill_set:
        return "Data Analyst"
    if {"python", "fastapi", "django", "flask", "javascript", "react", "rest api"} & skill_set:
        return "Software Engineer"
    if {"vlsi", "embedded systems", "pcb design"} & skill_set:
        return "Embedded Systems Engineer"
    if {"power bi", "tableau", "excel"} & skill_set:
        return "Business Analyst"
    if {"autocad", "solidworks", "catia"} & skill_set:
        return "Design Engineer"
    return None


@dataclass
class ParsedResume:
    text: str
    skills: list[str]
    full_name: str | None
    email: str | None
    phone: str | None
    summary: str | None
    education: str | None
    experience_years: str | None
    inferred_role: str | None


def parse_resume(file_path: str | Path) -> ParsedResume:
    text = extract_text_from_file(file_path)
    skills = extract_skills(text)
    contact = infer_contact_details(text)
    return ParsedResume(
        text=text,
        skills=skills,
        full_name=infer_full_name(text),
        email=contact["email"],
        phone=contact["phone"],
        summary=infer_summary(text),
        education=infer_education(text),
        experience_years=infer_experience_years(text),
        inferred_role=infer_role_from_skills(skills),
    )
