from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class DoseLog(Base):
    __tablename__ = "dose_logs"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Scheduled dose timestamp in UTC
    scheduled_at = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Status: PENDING, TAKEN, MISSED, SKIPPED
    status = Column(String(20), nullable=False, default="PENDING", index=True)
    
    # Audit info for when and who acknowledged or acted on the dose
    acted_at = Column(DateTime(timezone=True), nullable=True)
    acted_by_member_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    
    # Escalation level: 0 = normal (elder), 1 = escalated to caretaker, 2 = escalated to family
    escalation_level = Column(Integer, default=0, nullable=False)
    
    # Feature 3: Running Late (Snooze) - max 2 snoozes per dose
    snoozed_until = Column(DateTime(timezone=True), nullable=True, index=True)
    snooze_count = Column(Integer, default=0, nullable=False)

    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="dose_logs")
    medication = relationship("Medication", back_populates="dose_logs")
    actor = relationship("Member", back_populates="dose_actions", foreign_keys=[acted_by_member_id])
