from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import Job
from app.models.job_source import JobSource
from app.schemas.ingestion import ScrapeSelectors
from app.schemas.job import JobCreate

REMOTIVE_API_URL = "https://remotive.com/api/remote-jobs"
ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api"
HIMALAYAS_SEARCH_URL = "https://himalayas.app/jobs/api/search"

COUNTRY_CODES = {
    "india": {"adzuna": "in", "himalayas": "IN"},
    "united states": {"adzuna": "us", "himalayas": "US"},
    "united kingdom": {"adzuna": "gb", "himalayas": "GB"},
    "canada": {"adzuna": "ca", "himalayas": "CA"},
    "australia": {"adzuna": "au", "himalayas": "AU"},
    "germany": {"adzuna": "de", "himalayas": "DE"},
    "singapore": {"adzuna": "sg", "himalayas": "SG"},
}


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
        _clip_job_payload(data)
        if source:
            data["source_id"] = source.id
            data["source_name"] = source.name
        jobs.append(Job(**data, posted_by_id=posted_by_id))

    db.add_all(jobs)
    db.commit()
    for job in jobs:
        db.refresh(job)
    return jobs, skipped_count


def _clip_job_payload(data: dict) -> None:
    limits = {
        "title": 160,
        "company": 160,
        "location": 700,
        "job_type": 80,
        "source_url": 1000,
        "external_id": 500,
        "source_name": 160,
    }
    for field, limit in limits.items():
        value = data.get(field)
        if isinstance(value, str) and len(value) > limit:
            data[field] = value[:limit]


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


def fetch_provider_jobs(
    provider: str,
    query: str | None = None,
    category: str | None = None,
    country: str | None = None,
    limit: int = 25,
) -> list[JobCreate]:
    normalized_provider = provider.lower()
    if normalized_provider == "remotive":
        return fetch_remotive_jobs(query=query, category=category, limit=limit)
    if normalized_provider == "arbeitnow":
        return fetch_arbeitnow_jobs(query=query, country=country, limit=limit)
    if normalized_provider == "himalayas":
        return fetch_himalayas_jobs(query=query, country=country, limit=limit)
    if normalized_provider == "adzuna":
        return fetch_adzuna_jobs(query=query, country=country, limit=limit)
    raise ValueError("Unsupported provider. Use remotive, arbeitnow, himalayas, or adzuna.")


def fetch_remotive_jobs(
    query: str | None = None,
    category: str | None = None,
    limit: int = 25,
) -> list[JobCreate]:
    params = {}
    if query:
        params["search"] = query
    if category:
        params["category"] = category

    response = requests.get(REMOTIVE_API_URL, params=params, timeout=20)
    response.raise_for_status()
    raw_jobs = response.json().get("jobs", [])
    jobs = []

    for item in raw_jobs[:limit]:
        tags = item.get("tags") or []
        jobs.append(
            JobCreate(
                title=item["title"],
                company=item["company_name"],
                location=item.get("candidate_required_location") or "Remote",
                job_type=item.get("job_type"),
                salary_min=None,
                salary_max=None,
                skills=", ".join(tags) if isinstance(tags, list) else str(tags),
                description=item.get("description") or item["title"],
                source_url=item.get("url"),
                external_id=str(item.get("id") or item.get("url")),
                source_name="Remotive",
            )
        )
    return jobs


def fetch_arbeitnow_jobs(
    query: str | None = None,
    country: str | None = None,
    limit: int = 25,
) -> list[JobCreate]:
    response = requests.get(ARBEITNOW_API_URL, timeout=20)
    response.raise_for_status()
    raw_jobs = response.json().get("data", [])
    jobs = []
    normalized_query = query.lower() if query else None
    normalized_country = country.lower() if country else None

    for item in raw_jobs:
        tags = item.get("tags") or []
        searchable_text = " ".join(
            [
                item.get("title", ""),
                item.get("company_name", ""),
                item.get("location", ""),
                " ".join(tags) if isinstance(tags, list) else str(tags),
            ]
        ).lower()
        if normalized_query and normalized_query not in searchable_text:
            continue
        if normalized_country and normalized_country not in {"remote", "worldwide"} and normalized_country not in searchable_text:
            continue

        jobs.append(
            JobCreate(
                title=item["title"],
                company=item.get("company_name") or "Unknown company",
                location=item.get("location") or ("Remote" if item.get("remote") else "Not specified"),
                job_type="Remote" if item.get("remote") else None,
                skills=", ".join(tags) if isinstance(tags, list) else str(tags),
                description=item.get("description") or item["title"],
                source_url=item.get("url"),
                external_id=str(item.get("slug") or item.get("url")),
                source_name="Arbeitnow",
            )
        )
        if len(jobs) >= limit:
            break

    return jobs


def fetch_himalayas_jobs(
    query: str | None = None,
    country: str | None = None,
    limit: int = 25,
) -> list[JobCreate]:
    jobs = []
    page = 1
    country_code = _country_code(country, "himalayas")

    while len(jobs) < limit and page <= 5:
        params = {"q": query or "", "sort": "recent", "page": page}
        if country_code:
            params["country"] = country_code
        elif country and country.lower() in {"worldwide", "remote"}:
            params["worldwide"] = "true"

        response = requests.get(HIMALAYAS_SEARCH_URL, params=params, timeout=20)
        response.raise_for_status()
        raw_jobs = response.json().get("jobs", [])
        if not raw_jobs:
            break

        for item in raw_jobs:
            restrictions = item.get("locationRestrictions") or []
            location = ", ".join(
                restriction.get("name", "") if isinstance(restriction, dict) else str(restriction)
                for restriction in restrictions
                if restriction
            ) or "Worldwide"
            categories = item.get("categories") or []
            jobs.append(
                JobCreate(
                    title=item["title"],
                    company=item.get("companyName") or "Unknown company",
                    location=location,
                    job_type=item.get("employmentType"),
                    salary_min=int(item["minSalary"]) if item.get("minSalary") else None,
                    salary_max=int(item["maxSalary"]) if item.get("maxSalary") else None,
                    skills=", ".join(categories),
                    description=item.get("description") or item.get("excerpt") or item["title"],
                    source_url=item.get("applicationLink"),
                    external_id=str(item.get("guid") or item.get("applicationLink")),
                    source_name="Himalayas",
                )
            )
            if len(jobs) >= limit:
                break
        page += 1

    return jobs


def fetch_adzuna_jobs(
    query: str | None = None,
    country: str | None = None,
    limit: int = 25,
) -> list[JobCreate]:
    if not settings.adzuna_app_id or not settings.adzuna_app_key:
        return []

    country_code = _country_code(country, "adzuna") or "in"
    jobs = []
    page = 1

    while len(jobs) < limit and page <= 5:
        response = requests.get(
            f"https://api.adzuna.com/v1/api/jobs/{country_code}/search/{page}",
            params={
                "app_id": settings.adzuna_app_id,
                "app_key": settings.adzuna_app_key,
                "what": query or "",
                "where": "" if country and country.lower() in {"remote", "worldwide"} else (country or ""),
                "results_per_page": min(50, limit - len(jobs)),
                "content-type": "application/json",
            },
            timeout=20,
        )
        response.raise_for_status()
        raw_jobs = response.json().get("results", [])
        if not raw_jobs:
            break

        for item in raw_jobs:
            location_parts = item.get("location", {}).get("area") or []
            jobs.append(
                JobCreate(
                    title=item["title"],
                    company=(item.get("company") or {}).get("display_name") or "Unknown company",
                    location=", ".join(location_parts) or country or "Not specified",
                    job_type=item.get("contract_time") or item.get("contract_type"),
                    salary_min=int(item["salary_min"]) if item.get("salary_min") else None,
                    salary_max=int(item["salary_max"]) if item.get("salary_max") else None,
                    skills=query,
                    description=item.get("description") or item["title"],
                    source_url=item.get("redirect_url"),
                    external_id=str(item.get("id") or item.get("redirect_url")),
                    source_name="Adzuna",
                )
            )
        page += 1

    return jobs


def fetch_role_pack_jobs(
    roles: list[str],
    countries: list[str],
    limit_per_search: int = 50,
    include_external_key_providers: bool = True,
) -> list[JobCreate]:
    providers = ["himalayas", "remotive", "arbeitnow"]
    if include_external_key_providers:
        providers.append("adzuna")

    payloads = []
    seen_keys = set()

    search_terms = [
        (role, country, provider)
        for role in roles
        for country in countries
        for provider in providers
    ]

    def _fetch(search_term: tuple[str, str, str]) -> list[JobCreate]:
        role, country, provider = search_term
        try:
            return fetch_provider_jobs(
                provider,
                query=role,
                country=country,
                limit=limit_per_search,
            )
        except Exception:
            return []

    with ThreadPoolExecutor(max_workers=16) as executor:
        futures = [executor.submit(_fetch, search_term) for search_term in search_terms]
        for future in as_completed(futures):
            for job in future.result():
                key = job.source_url or f"{job.source_name}:{job.external_id}"
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                payloads.append(job)
    return payloads


def _country_code(country: str | None, provider: str) -> str | None:
    if not country:
        return None
    return COUNTRY_CODES.get(country.lower(), {}).get(provider)


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


