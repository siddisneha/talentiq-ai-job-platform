from pydantic import BaseModel

from app.schemas.job import JobRead


class ApiIngestionRequest(BaseModel):
    source_id: int | None = None
    source_name: str | None = None
    url: str


class ProviderIngestionRequest(BaseModel):
    query: str | None = None
    country: str | None = None
    category: str | None = None
    limit: int = 25


class RolePackIngestionRequest(BaseModel):
    roles: list[str] = []
    branches: list[str] = []
    countries: list[str] = ["Remote"]
    limit_per_search: int = 50
    include_external_key_providers: bool = True


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
