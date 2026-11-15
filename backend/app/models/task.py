from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class CareTask(Base):
    __tablename__ = "care_tasks"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(150), nullable=False)  # e.g. "Morning 20-min Garden Walk", "Check Blood Pressure"
    description = Column(Text, nullable=True)  # e.g. "Walk in society park with walking stick"
    category = Column(String(40), default="HEALTH_CHECK")  # EXERCISE, HEALTH_CHECK, NUTRITION, HYDRATION, ROUTINE, CUSTOM
    
    # Scheduled local time e.g. "07:30", "18:00"
    scheduled_time = Column(String(10), nullable=False, default="08:00")
    
    # 1-Month / Multi-day Planner range
    start_date = Column(Date, nullable=False, default=date.today)
    end_date = Column(Date, nullable=True)  # Up to 30 days / 1 month or open-ended
    days_of_week = Column(JSON, default=lambda: [0, 1, 2, 3, 4, 5, 6])  # 0=Mon, 6=Sun
    frequency = Column(String(20), default="DAILY")  # DAILY, WEEKLY, ONCE
    
    # Persistent alerts: keeps nudging elder and family until marked completed!
    persistent_alert = Column(Boolean, default=True)
    
    created_by_member_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    created_by_name = Column(String(100), default="Family")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="care_tasks")
    logs = relationship("CareTaskLog", back_populates="task", cascade="all, delete-orphan")


class CareTaskLog(Base):
    __tablename__ = "care_task_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("care_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    scheduled_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, COMPLETED, SKIPPED
    
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by_member_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    completed_by_name = Column(String(100), nullable=True)
    
    # Persistent nudge tracking
    nudge_count = Column(Integer, default=0)
    last_nudged_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    task = relationship("CareTask", back_populates="logs")
