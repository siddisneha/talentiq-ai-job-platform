from app.db.database import Base, SessionLocal, engine
from app.db.migrations import ensure_local_schema
import app.models
from app.models.job import Job


def seed_jobs():
    Base.metadata.create_all(bind=engine)
    ensure_local_schema()
    db = SessionLocal()
    try:
        db.query(Job).filter(Job.source_name == "Sample Seed Feed").update({"is_active": False})
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_jobs()
    print("Sample jobs are disabled. Import real jobs from the employer Post Jobs screen.")
