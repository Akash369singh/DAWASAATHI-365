from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class SOSEvent(Base):
    __tablename__ = "sos_events"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Who triggered the SOS (Elder or Caretaker)
    triggered_by = Column(String(100), nullable=False)
    triggered_by_member_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    
    # Geolocation coordinates (nullable - never blocks SOS if permission denied)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Status: OPEN, ACK, RESOLVED
    status = Column(String(20), nullable=False, default="OPEN", index=True)
    
    # Acknowledgment details (e.g. via magic link "I'm on it" or in-app)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    acknowledged_by_member_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    
    # Resolution details
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    
    # 5-minute unacknowledged escalation tracking
    escalation_sent = Column(Boolean, default=False)
    escalated_at = Column(DateTime(timezone=True), nullable=True)
    
    # Incident classification (e.g. GENERAL_SOS, OVERDOSE, WRONG_MEDICINE, ADVERSE_REACTION)
    incident_type = Column(String(50), default="GENERAL_SOS", nullable=True, index=True)
    medication_details = Column(Text, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    # Relationships
    profile = relationship("Profile", back_populates="sos_events")
    triggered_by_member = relationship("Member", foreign_keys=[triggered_by_member_id])
    acknowledged_by_member = relationship("Member", foreign_keys=[acknowledged_by_member_id])
