from pydantic import BaseModel

from app.schemas.job import JobRead


class ApiIngestionRequest(BaseModel):
    source_id: int | None = None
    source_name: str | None = None
    url: str


class ScrapeSelectors(BaseModel):
    item: str
    title: str
    company: str
    location: str
    description: str
    link: str | None = None
    job_type: str | None = None
    skills: str | None = None


class ScrapeIngestionRequest(BaseModel):
    source_id: int | None = None
    source_name: str | None = None
    url: str
    selectors: ScrapeSelectors


class IngestionResult(BaseModel):
    created_count: int
    skipped_count: int
    jobs: list[JobRead]
