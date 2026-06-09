from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.job import Job
from app.schemas.job import JobRead
from app.api.routes.jobs import real_job_query

router = APIRouter()


@router.get("/jobs", response_model=list[JobRead])
def public_jobs(
    search: str | None = Query(default=None),
    branch: str | None = Query(default=None),
    location: str | None = Query(default=None),
    skill: str | None = Query(default=None),
    job_type: str | None = Query(default=None),
    salary_min: int | None = Query(default=None),
    salary_max: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    from app.api.routes.jobs import COUNTRY_LOCATION_ALIASES
    from app.services.role_packs import BRANCH_ROLE_PACKS, branch_search_terms, normalize_branch_key
    from sqlalchemy import or_

    query = real_job_query(db)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Job.title.ilike(pattern),
                Job.company.ilike(pattern),
                Job.description.ilike(pattern),
                Job.skills.ilike(pattern),
            )
        )
    if branch:
        branch_pack = BRANCH_ROLE_PACKS.get(normalize_branch_key(branch))
        if branch_pack:
            branch_terms = branch_search_terms(branch)
            query = query.filter(
                or_(
                    *(
                        condition
                        for term in branch_terms
                        for condition in (
                            Job.title.ilike(f"%{term}%"),
                            Job.skills.ilike(f"%{term}%"),
                        )
                    )
                )
            )
    if location:
        location_terms = COUNTRY_LOCATION_ALIASES.get(location.lower(), [location])
        query = query.filter(or_(*(Job.location.ilike(f"%{term}%") for term in location_terms)))
    if skill:
        query = query.filter(Job.skills.ilike(f"%{skill}%"))
    if job_type:
        query = query.filter(Job.job_type.ilike(f"%{job_type}%"))
    if salary_min is not None:
        query = query.filter(Job.salary_max >= salary_min)
    if salary_max is not None:
        query = query.filter(Job.salary_min <= salary_max)
    return query.order_by(Job.created_at.desc()).limit(50).all()
