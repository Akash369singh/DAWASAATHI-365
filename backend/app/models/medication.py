from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False, index=True)  # e.g. "Metformin"
    dosage = Column(String(60), nullable=False)  # e.g. "500 mg"
    form = Column(String(40), nullable=False, default="Tablet")  # Tablet, Capsule, Syrup, Drops, Injection
    instructions = Column(String(200), nullable=True)  # "After food with warm water"
    times_per_day = Column(Integer, default=1)
    
    # JSON list of HH:MM strings (in profile local time), e.g. ["08:30", "20:30"]
    schedule_times = Column(JSON, default=list, nullable=False)
    
    # JSON list of integers: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
    days_of_week = Column(JSON, default=lambda: [0, 1, 2, 3, 4, 5, 6], nullable=False)
    
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Inventory / Stock tracking
    stock_count = Column(Integer, default=30)
    refill_alert_threshold = Column(Integer, default=7)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="medications")
    dose_logs = relationship("DoseLog", back_populates="medication", cascade="all, delete-orphan")
