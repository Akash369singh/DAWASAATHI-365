from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class HealthVital(Base):
    __tablename__ = "health_vitals"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Types: BLOOD_PRESSURE, BLOOD_GLUCOSE, OXYGEN_SPO2, HEART_RATE, WEIGHT
    vital_type = Column(String(40), nullable=False, index=True)
    
    # Primary value (e.g. Systolic BP 120, Glucose 110, SpO2 98, Pulse 72, Weight 68.5)
    value_numeric = Column(Float, nullable=False)
    
    # Secondary value (e.g. Diastolic BP 80)
    value_secondary = Column(Float, nullable=True)
    
    unit = Column(String(20), nullable=False)  # mmHg, mg/dL, %, bpm, kg
    context = Column(String(50), nullable=True)  # Fasting, Post-Meal, Resting, Walking
    notes = Column(Text, nullable=True)
    
    recorded_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationship
    profile = relationship("Profile", back_populates="vitals")
