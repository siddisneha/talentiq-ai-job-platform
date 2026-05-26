from __future__ import annotations

import os
import json
from functools import lru_cache

from app.core.config import settings
from app.models.job import Job
from app.models.user import User


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
