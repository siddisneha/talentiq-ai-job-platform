from app.db.database import Base, SessionLocal, engine
from app.db.migrations import ensure_local_schema
import app.models
from app.models.job import Job
from app.models.job_source import JobSource


def seed_jobs():
    Base.metadata.create_all(bind=engine)
    ensure_local_schema()
    db = SessionLocal()
    try:
        source = db.query(JobSource).filter(JobSource.name == "Sample Seed Feed").first()
        if source is None:
            source = JobSource(
                name="Sample Seed Feed",
                source_type="manual",
                base_url="https://example.com/jobs",
            )
            db.add(source)
            db.commit()
            db.refresh(source)

        if db.query(Job).count() > 0:
            db.query(Job).filter(Job.source_id.is_(None)).update(
                {"source_id": source.id, "source_name": source.name}
            )
            db.commit()
            return

        jobs = [
            Job(
                title="Python Backend Developer",
                company="TechNova Solutions",
                location="Bengaluru",
                job_type="Full-time",
                salary_min=500000,
                salary_max=900000,
                skills="Python, FastAPI, SQL, REST API",
                description="Build backend APIs for a growing SaaS platform.",
                source_url="https://example.com/jobs/python-backend",
                source_id=source.id,
                source_name=source.name,
                external_id="python-backend",
            ),
            Job(
                title="React Frontend Developer",
                company="BrightHire",
                location="Hyderabad",
                job_type="Full-time",
                salary_min=450000,
                salary_max=850000,
                skills="React, JavaScript, CSS, API Integration",
                description="Create dynamic dashboards and job search interfaces.",
                source_url="https://example.com/jobs/react-frontend",
                source_id=source.id,
                source_name=source.name,
                external_id="react-frontend",
            ),
            Job(
                title="Data Analyst Intern",
                company="CareerPulse Analytics",
                location="Remote",
                job_type="Internship",
                salary_min=15000,
                salary_max=30000,
                skills="Python, Pandas, Excel, SQL",
                description="Analyze job market trends and user engagement data.",
                source_url="https://example.com/jobs/data-analyst-intern",
                source_id=source.id,
                source_name=source.name,
                external_id="data-analyst-intern",
            ),
            Job(
                title="Machine Learning Engineer",
                company="TalentGraph AI",
                location="Pune",
                job_type="Full-time",
                salary_min=900000,
                salary_max=1600000,
                skills="Python, Scikit-learn, NLP, SQL",
                description="Build matching and recommendation workflows for job postings using lightweight Python tools.",
                source_url="https://example.com/jobs/ml-engineer",
                source_id=source.id,
                source_name=source.name,
                external_id="ml-engineer",
            ),
            Job(
                title="Cloud DevOps Engineer",
                company="HireStack Cloud",
                location="Bengaluru",
                job_type="Full-time",
                salary_min=800000,
                salary_max=1500000,
                skills="AWS, Docker, CI/CD, Python, Monitoring",
                description="Operate scalable cloud infrastructure for the job portal platform.",
                source_url="https://example.com/jobs/cloud-devops",
                source_id=source.id,
                source_name=source.name,
                external_id="cloud-devops",
            ),
            Job(
                title="Business Intelligence Analyst",
                company="MarketPulse Careers",
                location="Mumbai",
                job_type="Full-time",
                salary_min=600000,
                salary_max=1100000,
                skills="Power BI, Tableau, SQL, Excel, Analytics",
                description="Create dashboards for salary trends, role demand, and user engagement.",
                source_url="https://example.com/jobs/bi-analyst",
                source_id=source.id,
                source_name=source.name,
                external_id="bi-analyst",
            ),
        ]
        db.add_all(jobs)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_jobs()
    print("Seed data created")
