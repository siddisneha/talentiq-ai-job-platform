from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

import numpy as np
from sklearn.linear_model import LinearRegression

from app.models.activity_log import ActivityLog
from app.models.application import Application
from app.models.job import Job
from app.models.saved_job import SavedJob
from app.models.user import User
from app.services.recommendations import extract_known_skills, split_skills


def _date_key(value: datetime | None) -> str:
    if value is None:
        value = datetime.now(timezone.utc)
    return value.date().isoformat()


def _linear_forecast(daily_counts: dict[str, int], days: int = 7) -> list[dict]:
    if not daily_counts:
        today = datetime.now(timezone.utc).date()
        return [{"date": (today + timedelta(days=index + 1)).isoformat(), "predicted_count": 0} for index in range(days)]

    sorted_days = sorted(daily_counts)
    start = datetime.fromisoformat(sorted_days[0]).date()
    x = np.array([(datetime.fromisoformat(day).date() - start).days for day in sorted_days]).reshape(-1, 1)
    y = np.array([daily_counts[day] for day in sorted_days])

    if len(sorted_days) < 2:
        baseline = int(y[0])
        last_day = datetime.fromisoformat(sorted_days[-1]).date()
        return [
            {"date": (last_day + timedelta(days=index + 1)).isoformat(), "predicted_count": baseline}
            for index in range(days)
        ]

    model = LinearRegression()
    model.fit(x, y)
    last_offset = int(x[-1][0])
    future_x = np.array([last_offset + index + 1 for index in range(days)]).reshape(-1, 1)
    predictions = model.predict(future_x)
    last_day = datetime.fromisoformat(sorted_days[-1]).date()
    return [
        {
            "date": (last_day + timedelta(days=index + 1)).isoformat(),
            "predicted_count": max(int(round(float(value))), 0),
        }
        for index, value in enumerate(predictions)
    ]


def predict_job_trends(jobs: list[Job], days: int = 7) -> dict:
    daily_counts: dict[str, int] = defaultdict(int)
    role_counter: Counter[str] = Counter()
    skill_counter: Counter[str] = Counter()

    for job in jobs:
        daily_counts[_date_key(job.created_at)] += 1
        role_counter[job.title] += 1
        skill_counter.update(extract_known_skills(" ".join([job.title or "", job.skills or "", job.description or ""])))
        skill_counter.update(split_skills(job.skills or ""))

    forecast = _linear_forecast(daily_counts, days=days)
    current_volume = sum(daily_counts.values())
    predicted_volume = sum(item["predicted_count"] for item in forecast)
    direction = "stable"
    if predicted_volume > current_volume * 0.12:
        direction = "rising"
    elif predicted_volume < current_volume * 0.06 and current_volume > 0:
        direction = "cooling"

    return {
        "forecast": forecast,
        "trend_direction": direction,
        "top_growth_roles": [{"name": name, "count": count} for name, count in role_counter.most_common(6)],
        "top_growth_skills": [{"name": name, "count": count} for name, count in skill_counter.most_common(10)],
    }


def predict_user_engagement(
    current_user: User,
    applications: list[Application],
    saved_jobs: list[SavedJob],
    activity_logs: list[ActivityLog],
    recommended_count: int,
) -> dict:
    profile_fields = [
        current_user.full_name,
        current_user.skills,
        current_user.preferred_role,
        current_user.preferred_location,
        current_user.resume_url,
        current_user.summary,
    ]
    profile_completion = round(sum(1 for value in profile_fields if value) / len(profile_fields) * 100)
    activity_score = min(len(activity_logs) * 4, 30)
    save_score = min(len(saved_jobs) * 5, 20)
    application_score = min(len(applications) * 8, 25)
    recommendation_score = min(recommended_count * 3, 15)
    engagement_score = min(profile_completion * 0.35 + activity_score + save_score + application_score + recommendation_score, 100)

    if engagement_score >= 75:
        segment = "high intent"
        next_action = "Apply to the strongest matches and keep tracking recruiter responses."
    elif engagement_score >= 45:
        segment = "warming up"
        next_action = "Save matching roles and complete missing profile fields."
    else:
        segment = "needs activation"
        next_action = (
            "Add skills, preferred role, and location to unlock better recommendations."
            if current_user.resume_url
            else "Upload a resume and add skills to unlock better recommendations."
        )

    return {
        "score": round(engagement_score, 2),
        "segment": segment,
        "profile_completion": profile_completion,
        "next_action": next_action,
    }


def build_powerbi_dataset(
    jobs: list[Job],
    applications: list[Application],
    saved_jobs: list[SavedJob],
    activity_logs: list[ActivityLog],
) -> dict:
    return {
        "jobs": [
            {
                "job_id": job.id,
                "title": job.title,
                "company": job.company,
                "location": job.location,
                "job_type": job.job_type,
                "salary_min": job.salary_min,
                "salary_max": job.salary_max,
                "skills": job.skills,
                "source": job.source_name or "Portal",
                "created_date": _date_key(job.created_at),
                "is_active": job.is_active,
            }
            for job in jobs
        ],
        "applications": [
            {
                "application_id": application.id,
                "job_id": application.job_id,
                "user_id": application.user_id,
                "status": application.status,
                "created_date": _date_key(application.created_at),
            }
            for application in applications
        ],
        "saved_jobs": [
            {
                "saved_job_id": saved.id,
                "job_id": saved.job_id,
                "user_id": saved.user_id,
                "created_date": _date_key(saved.created_at),
            }
            for saved in saved_jobs
        ],
        "activity": [
            {
                "activity_id": activity.id,
                "job_id": activity.job_id,
                "user_id": activity.user_id,
                "event_type": activity.event_type,
                "search_query": activity.search_query,
                "created_date": _date_key(activity.created_at),
            }
            for activity in activity_logs
        ],
    }
