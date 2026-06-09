from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (UniqueConstraint("source_id", "external_id", name="uq_job_source_external"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(160), index=True)
    company: Mapped[str] = mapped_column(String(160), index=True)
    location: Mapped[str] = mapped_column(String(700), index=True)
    job_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    skills: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_id: Mapped[int | None] = mapped_column(ForeignKey("job_sources.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    posted_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    source = relationship("JobSource", back_populates="jobs")
    posted_by = relationship("User", back_populates="jobs")
    saved_by = relationship("SavedJob", back_populates="job", cascade="all, delete")
    applications = relationship("Application", back_populates="job", cascade="all, delete")
    activity_logs = relationship("ActivityLog", back_populates="job", cascade="all, delete")
