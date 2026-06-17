import sys, time
sys.path.insert(0, ".")

import app.models
from app.db.database import Base, SessionLocal, engine
from app.db.migrations import ensure_local_schema
from app.models.user import User
from app.services.ingestion import (
    create_jobs_from_payloads,
    resolve_source,
    fetch_provider_jobs
)

Base.metadata.create_all(bind=engine)
ensure_local_schema()
db = SessionLocal()

importer = db.query(User).filter(User.email == "imports@avenir.local").first()
if importer is None:
    importer = db.query(User).filter(User.role == "admin").first()
print(f"Using importer account: {importer.email}")

providers = [
    ("Remotive", "https://remotive.com"),
    ("Arbeitnow", "https://www.arbeitnow.com"),
    ("Himalayas", "https://himalayas.app"),
    ("Adzuna", "https://www.adzuna.com"),
    ("The Muse", "https://www.themuse.com"),
    ("Working Nomads", "https://www.workingnomads.com"),
    ("WeWorkRemotely", "https://weworkremotely.com"),
    ("Dribbble", "https://dribbble.com"),
    ("Python.org", "https://www.python.org"),
    ("RemoteOK", "https://remoteok.com")
]

print("\n=== STARTING 10 SOURCES IMPORT ===")
for name, url in providers:
    print(f"\nSource: {name} ({url})")
    try:
        source_obj = resolve_source(db, None, name, "api" if "feed" not in name.lower() else "rss", url)
        
        # Determine a query or category if needed
        query = None
        if name == "Python.org":
            query = "Python"
        elif name == "Dribbble":
            query = "Design"
        
        jobs_in = fetch_provider_jobs(name, query=query, limit=50)
        print(f"  Fetched {len(jobs_in)} jobs")
        if jobs_in:
            jobs, skipped = create_jobs_from_payloads(db, jobs_in, importer.id, source_obj)
            print(f"  Successfully inserted: {len(jobs)} (Skipped/Duplicate: {skipped})")
    except Exception as e:
        print(f"  FAILED to import from {name}: {e}")
    time.sleep(0.5)

db.close()

import sqlite3
conn = sqlite3.connect("job_portal.db")
total = conn.execute("SELECT COUNT(*) FROM jobs WHERE is_active=1").fetchone()[0]
rows = conn.execute("SELECT source_name, COUNT(*) FROM jobs WHERE is_active=1 GROUP BY source_name ORDER BY COUNT(*) DESC").fetchall()
conn.close()

print(f"\n=== JOB DATABASE METRICS ===")
print(f"Total Active Jobs: {total}")
for src, cnt in rows:
    print(f"  - {src or 'Other/Portal'}: {cnt}")
