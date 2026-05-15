from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.ingestion import (
    ApiIngestionRequest,
    IngestionResult,
    ProviderIngestionRequest,
    RolePackIngestionRequest,
    ScrapeIngestionRequest,
)
from app.schemas.job import JobCreate
from app.services.ingestion import (
    create_jobs_from_payloads,
    fetch_api_jobs,
    fetch_provider_jobs,
    fetch_role_pack_jobs,
    resolve_source,
    scrape_jobs,
)
from app.services.role_packs import expand_roles_for_branches

router = APIRouter()


def ensure_can_ingest_jobs(user: User) -> None:
    if user.role not in {"employer", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employer or admin accounts can import job posts",
        )


@router.post("/jobs/bulk", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
def bulk_import_jobs(
    jobs_in: list[JobCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_ingest_jobs(current_user)
    jobs, skipped_count = create_jobs_from_payloads(db, jobs_in, current_user.id)
    return {"created_count": len(jobs), "skipped_count": skipped_count, "jobs": jobs}


@router.post("/external-api", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
def import_from_external_api(
    ingestion_in: ApiIngestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_ingest_jobs(current_user)
    source = resolve_source(
        db,
        ingestion_in.source_id,
        ingestion_in.source_name,
        source_type="api",
        base_url=ingestion_in.url,
    )
    try:
        jobs_in = fetch_api_jobs(ingestion_in.url)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"API ingestion failed: {exc}") from exc

    jobs, skipped_count = create_jobs_from_payloads(db, jobs_in, current_user.id, source)
    return {"created_count": len(jobs), "skipped_count": skipped_count, "jobs": jobs}


@router.post("/providers/{provider}", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
def import_from_provider(
    provider: str,
    ingestion_in: ProviderIngestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_ingest_jobs(current_user)
    provider_name = provider.lower()
    provider_sources = {
        "remotive": ("Remotive", "https://remotive.com/remote-jobs"),
        "arbeitnow": ("Arbeitnow", "https://www.arbeitnow.com"),
        "himalayas": ("Himalayas", "https://himalayas.app/jobs"),
        "adzuna": ("Adzuna", "https://www.adzuna.com"),
    }
    source_name, base_url = provider_sources.get(provider_name, (provider.title(), None))
    source = resolve_source(
        db,
        source_id=None,
        source_name=source_name,
        source_type="api",
        base_url=base_url,
    )
    try:
        jobs_in = fetch_provider_jobs(
            provider=provider,
            query=ingestion_in.query,
            category=ingestion_in.category,
            country=ingestion_in.country,
            limit=max(1, min(ingestion_in.limit, 100)),
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Provider ingestion failed: {exc}") from exc

    jobs, skipped_count = create_jobs_from_payloads(db, jobs_in, current_user.id, source)
    return {"created_count": len(jobs), "skipped_count": skipped_count, "jobs": jobs}


@router.post("/role-pack", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
def import_role_pack(
    ingestion_in: RolePackIngestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_ingest_jobs(current_user)
    roles = expand_roles_for_branches(ingestion_in.roles, ingestion_in.branches)
    if not roles:
        raise HTTPException(status_code=400, detail="Add at least one role or branch")
    try:
        jobs_in = fetch_role_pack_jobs(
            roles=roles,
            countries=ingestion_in.countries,
            limit_per_search=max(1, min(ingestion_in.limit_per_search, 100)),
            include_external_key_providers=ingestion_in.include_external_key_providers,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Role-pack ingestion failed: {exc}") from exc

    jobs, skipped_count = create_jobs_from_payloads(db, jobs_in, current_user.id)
    return {"created_count": len(jobs), "skipped_count": skipped_count, "jobs": jobs}


@router.post("/scrape", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
def import_from_scraper(
    ingestion_in: ScrapeIngestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_ingest_jobs(current_user)
    source = resolve_source(
        db,
        ingestion_in.source_id,
        ingestion_in.source_name,
        source_type="scraper",
        base_url=ingestion_in.url,
    )
    try:
        jobs_in = scrape_jobs(ingestion_in.url, ingestion_in.selectors)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Scraping failed: {exc}") from exc

    jobs, skipped_count = create_jobs_from_payloads(db, jobs_in, current_user.id, source)
    return {"created_count": len(jobs), "skipped_count": skipped_count, "jobs": jobs}
