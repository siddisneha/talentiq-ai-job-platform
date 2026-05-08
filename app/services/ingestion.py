from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.models.job import Job
from app.models.job_source import JobSource
from app.schemas.ingestion import ScrapeSelectors
from app.schemas.job import JobCreate


def resolve_source(
    db: Session,
    source_id: int | None,
    source_name: str | None,
    source_type: str,
    base_url: str | None = None,
) -> JobSource | None:
    if source_id:
        return db.get(JobSource, source_id)
    if not source_name:
        return None

    source = db.query(JobSource).filter(JobSource.name == source_name).first()
    if source:
        return source

    source = JobSource(name=source_name, source_type=source_type, base_url=base_url)
    db.add(source)
    db.flush()
    return source


def create_jobs_from_payloads(
    db: Session,
    payloads: list[JobCreate],
    posted_by_id: int,
    source: JobSource | None = None,
) -> tuple[list[Job], int]:
    jobs: list[Job] = []
    skipped_count = 0

    for job_in in payloads:
        existing = None
        if job_in.source_id and job_in.external_id:
            existing = (
                db.query(Job)
                .filter(Job.source_id == job_in.source_id, Job.external_id == job_in.external_id)
                .first()
            )
        if not existing and job_in.source_url:
            existing = db.query(Job).filter(Job.source_url == job_in.source_url).first()
        if existing:
            skipped_count += 1
            continue

        data = job_in.model_dump()
        if source:
            data["source_id"] = source.id
            data["source_name"] = source.name
        jobs.append(Job(**data, posted_by_id=posted_by_id))

    db.add_all(jobs)
    db.commit()
    for job in jobs:
        db.refresh(job)
    return jobs, skipped_count


def fetch_api_jobs(url: str) -> list[JobCreate]:
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    raw_jobs = response.json()
    if isinstance(raw_jobs, dict):
        raw_jobs = raw_jobs.get("jobs", [])

    jobs = []
    for item in raw_jobs:
        jobs.append(
            JobCreate(
                title=item["title"],
                company=item["company"],
                location=item.get("location", "Remote"),
                job_type=item.get("job_type"),
                salary_min=item.get("salary_min"),
                salary_max=item.get("salary_max"),
                skills=item.get("skills"),
                description=item.get("description", item.get("title", "")),
                source_url=item.get("source_url") or item.get("url"),
                external_id=str(item.get("id") or item.get("external_id") or item.get("source_url") or item.get("url")),
            )
        )
    return jobs


def scrape_jobs(url: str, selectors: ScrapeSelectors) -> list[JobCreate]:
    response = requests.get(url, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    jobs = []

    for card in soup.select(selectors.item):
        link = card.select_one(selectors.link) if selectors.link else None
        source_url = urljoin(url, link.get("href")) if link and link.get("href") else url
        jobs.append(
            JobCreate(
                title=_text(card, selectors.title),
                company=_text(card, selectors.company),
                location=_text(card, selectors.location) or "Remote",
                job_type=_text(card, selectors.job_type) if selectors.job_type else None,
                skills=_text(card, selectors.skills) if selectors.skills else None,
                description=_text(card, selectors.description) or _text(card, selectors.title),
                source_url=source_url,
                external_id=source_url,
            )
        )
    return jobs


def _text(card, selector: str) -> str:
    element = card.select_one(selector)
    return element.get_text(" ", strip=True) if element else ""
