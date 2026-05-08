from datetime import datetime, timezone

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    headline: Mapped[str | None] = mapped_column(String(160), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    experience_years: Mapped[str | None] = mapped_column(String(40), nullable=True)
    education: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    preferred_location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    preferred_role: Mapped[str | None] = mapped_column(String(120), nullable=True)
    preferred_job_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    expected_salary: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notice_period: Mapped[str | None] = mapped_column(String(80), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    jobs = relationship("Job", back_populates="posted_by")
    saved_jobs = relationship("SavedJob", back_populates="user", cascade="all, delete")
    applications = relationship("Application", back_populates="user", cascade="all, delete")
    activity_logs = relationship("ActivityLog", back_populates="user", cascade="all, delete")
    job_alerts = relationship("JobAlert", back_populates="user", cascade="all, delete")
