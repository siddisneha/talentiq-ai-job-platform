from sqlalchemy import inspect, text

from app.db.database import engine


def ensure_local_schema() -> None:
    """Apply tiny SQLite-only upgrades for the local prototype database."""
    if not engine.url.drivername.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "jobs" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("jobs")}
    statements = []
    if "external_id" not in columns:
        statements.append("ALTER TABLE jobs ADD COLUMN external_id VARCHAR(180)")
    if "source_name" not in columns:
        statements.append("ALTER TABLE jobs ADD COLUMN source_name VARCHAR(160)")
    if "source_id" not in columns:
        statements.append("ALTER TABLE jobs ADD COLUMN source_id INTEGER")
    if "expires_at" not in columns:
        statements.append("ALTER TABLE jobs ADD COLUMN expires_at DATETIME")

    if statements:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))

    with engine.begin() as connection:
        connection.execute(
            text(
                "UPDATE jobs SET is_active = 0 "
                "WHERE source_name = 'Sample Seed Feed' OR source_url LIKE 'https://example.com/%'"
            )
        )

    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    user_statements = []
    for column_name, column_type in {
        "phone": "VARCHAR(40)",
        "headline": "VARCHAR(160)",
        "summary": "TEXT",
        "experience_years": "VARCHAR(40)",
        "education": "TEXT",
        "current_location": "VARCHAR(120)",
        "preferred_branch": "VARCHAR(120)",
        "preferred_job_type": "VARCHAR(80)",
        "expected_salary": "VARCHAR(80)",
        "notice_period": "VARCHAR(80)",
        "linkedin_url": "VARCHAR(500)",
        "github_url": "VARCHAR(500)",
        "portfolio_url": "VARCHAR(500)",
        "role": "VARCHAR(30) DEFAULT 'candidate'",
    }.items():
        if column_name not in user_columns:
            user_statements.append(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")

    if not user_statements:
        return

    with engine.begin() as connection:
        for statement in user_statements:
            connection.execute(text(statement))
