from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class CheckIn(Base):
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)

    # Mood: GOOD, OKAY, NOT_WELL
    mood = Column(String(20), nullable=False)
    note = Column(Text, nullable=True)

    # Date in elder's timezone (YYYY-MM-DD) for 1-checkin-per-day enforcement
    checkin_date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="checkins")
    member = relationship("Member")
