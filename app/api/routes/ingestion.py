from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.ingestion import ApiIngestionRequest, IngestionResult, ScrapeIngestionRequest
from app.schemas.job import JobCreate
from app.services.ingestion import (
    create_jobs_from_payloads,
    fetch_api_jobs,
    resolve_source,
    scrape_jobs,
)

router = APIRouter()


@router.post("/jobs/bulk", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
def bulk_import_jobs(
    jobs_in: list[JobCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    jobs, skipped_count = create_jobs_from_payloads(db, jobs_in, current_user.id)
    return {"created_count": len(jobs), "skipped_count": skipped_count, "jobs": jobs}


@router.post("/external-api", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
def import_from_external_api(
    ingestion_in: ApiIngestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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


@router.post("/scrape", response_model=IngestionResult, status_code=status.HTTP_201_CREATED)
def import_from_scraper(
    ingestion_in: ScrapeIngestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
