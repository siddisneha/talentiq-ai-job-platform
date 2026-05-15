import argparse

import app.models
from app.db.database import Base, SessionLocal, engine
from app.db.migrations import ensure_local_schema
from app.models.user import User
from app.services.ingestion import create_jobs_from_payloads, fetch_role_pack_jobs
from app.services.role_packs import expand_roles_for_branches

DEFAULT_ROLES = []
DEFAULT_BRANCHES = ["data_ai", "cse_it", "ece", "eee"]
DEFAULT_COUNTRIES = ["India", "Remote", "United States", "United Kingdom", "Canada"]


def import_jobs(
    roles: list[str],
    branches: list[str],
    countries: list[str],
    limit_per_search: int,
    posted_by_email: str,
) -> tuple[int, int]:
    Base.metadata.create_all(bind=engine)
    ensure_local_schema()
    db = SessionLocal()
    try:
        importer = db.query(User).filter(User.email == posted_by_email).first()
        if importer is None:
            importer = User(
                full_name="TalentIQ Importer",
                email=posted_by_email,
                hashed_password="external-import-account",
                role="admin",
            )
            db.add(importer)
            db.commit()
            db.refresh(importer)

        expanded_roles = expand_roles_for_branches(roles, branches)
        if not expanded_roles:
            raise ValueError("Add at least one role or branch to import jobs.")

        payloads = fetch_role_pack_jobs(
            roles=expanded_roles,
            countries=countries,
            limit_per_search=limit_per_search,
            include_external_key_providers=True,
        )
        jobs, skipped_count = create_jobs_from_payloads(db, payloads, importer.id)
        return len(jobs), skipped_count
    finally:
        db.close()


def parse_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def main() -> None:
    parser = argparse.ArgumentParser(description="Import fresh external jobs into TalentIQ.")
    parser.add_argument("--roles", default=",".join(DEFAULT_ROLES))
    parser.add_argument("--branches", default=",".join(DEFAULT_BRANCHES))
    parser.add_argument("--countries", default=",".join(DEFAULT_COUNTRIES))
    parser.add_argument("--limit-per-search", type=int, default=50)
    parser.add_argument("--posted-by-email", default="imports@talentiq.local")
    args = parser.parse_args()

    created_count, skipped_count = import_jobs(
        roles=parse_csv(args.roles),
        branches=parse_csv(args.branches),
        countries=parse_csv(args.countries),
        limit_per_search=args.limit_per_search,
        posted_by_email=args.posted_by_email,
    )
    print(f"Imported {created_count} jobs; skipped {skipped_count} duplicates.")


if __name__ == "__main__":
    main()
