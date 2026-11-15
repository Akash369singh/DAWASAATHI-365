from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_name = Column(String(120), nullable=False)
    specialty = Column(String(100), nullable=False, default="General Physician")
    location = Column(String(255), nullable=False)
    scheduled_datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="SCHEDULED", index=True)  # SCHEDULED, COMPLETED, CANCELLED
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="appointments")
