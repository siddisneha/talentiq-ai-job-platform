from __future__ import annotations

from functools import lru_cache

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.job import Job
from app.models.user import User
from app.services.recommendations import split_skills
from app.services.llm_assistant import llm_enabled

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - optional dependency fallback
    SentenceTransformer = None


MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def _get_embedding_model():
    if SentenceTransformer is None:
        return None
    return SentenceTransformer(MODEL_NAME)


def _job_to_text(job: Job) -> str:
    return " ".join(
        [
            job.title or "",
            job.company or "",
            job.location or "",
            job.job_type or "",
            job.skills or "",
            job.description or "",
        ]
    ).strip()


def _user_to_text(user: User) -> str:
    return " ".join(
        [
            user.preferred_role or "",
            user.preferred_branch or "",
            user.preferred_location or "",
            user.headline or "",
            user.summary or "",
            user.skills or "",
        ]
    ).strip()


def _fallback_scores(user: User, jobs: list[Job]) -> list[dict]:
    user_text = " ".join(split_skills(user.skills or ""))
    job_texts = [_job_to_text(job) for job in jobs]
    all_texts = [user_text] + job_texts
    vectorizer = TfidfVectorizer(stop_words="english")
    vectors = vectorizer.fit_transform(all_texts)
    similarities = cosine_similarity(vectors[0], vectors[1:]).flatten()
    return [
        {
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            "score": round(float(score) * 100, 2),
            "method": "tfidf",
        }
        for job, score in sorted(zip(jobs, similarities), key=lambda item: item[1], reverse=True)
    ]


def _embedding_scores(user: User, jobs: list[Job]) -> list[dict]:
    model = _get_embedding_model()
    if model is None:
        return _fallback_scores(user, jobs)

    user_text = _user_to_text(user)
    job_texts = [_job_to_text(job) for job in jobs]
    texts = [user_text] + job_texts

    embeddings = model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
    user_embedding = embeddings[0:1]
    job_embeddings = embeddings[1:]
    similarities = cosine_similarity(user_embedding, job_embeddings).flatten()

    return [
        {
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            "score": round(float(score) * 100, 2),
            "method": "embedding",
        }
        for job, score in sorted(zip(jobs, similarities), key=lambda item: item[1], reverse=True)
    ]


def recommend_jobs_ml(user: User, jobs: list[Job], top_n: int = 5):
    scored_jobs = _embedding_scores(user, jobs)
    return scored_jobs[:top_n]


def recommendation_mode() -> str:
    return "embedding+llm-ready" if llm_enabled() else "embedding"
