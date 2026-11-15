from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(16), unique=True, index=True, nullable=False)  # e.g. "CARE-7291"
    name = Column(String(100), nullable=False)  # e.g. "Patel Family Care Circle"
    elder_name = Column(String(100), nullable=False)  # e.g. "Ramesh Patel"
    elder_age = Column(Integer, nullable=False, default=70)
    timezone = Column(String(50), nullable=False, default="Asia/Kolkata")
    
    # Timing and escalation preferences (in minutes)
    grace_window_minutes = Column(Integer, default=45)  # grace period before auto-marking MISSED
    escalation_level_1_mins = Column(Integer, default=15)  # mins after scheduled time to alert caretaker
    escalation_level_2_mins = Column(Integer, default=30)  # mins after level 1 to alert family
    
    # Feature 2: Emergency QR Card & Wallet Pass settings
    emergency_card_enabled = Column(Boolean, default=False)
    emergency_card_token = Column(String(64), unique=True, index=True, nullable=True)
    emergency_card_fields = Column(JSON, default=dict)
    blood_group = Column(String(10), nullable=True)  # e.g. "B+ POSITIVE"
    allergies = Column(Text, nullable=True)  # e.g. "Penicillin, Sulfa drugs"
    emergency_notes = Column(Text, nullable=True)  # e.g. "Diabetic, pacemaker fitted"

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    members = relationship("Member", back_populates="profile", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="profile", cascade="all, delete-orphan")
    dose_logs = relationship("DoseLog", back_populates="profile", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="profile", cascade="all, delete-orphan")
    notifications = relationship("NotificationLog", back_populates="profile", cascade="all, delete-orphan")
    action_tokens = relationship("ActionToken", back_populates="profile", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="profile", cascade="all, delete-orphan")
    vitals = relationship("HealthVital", back_populates="profile", cascade="all, delete-orphan")
    care_tasks = relationship("CareTask", back_populates="profile", cascade="all, delete-orphan")
    family_messages = relationship("FamilyMessage", back_populates="profile", cascade="all, delete-orphan")
    sos_events = relationship("SOSEvent", back_populates="profile", cascade="all, delete-orphan")
    checkins = relationship("CheckIn", back_populates="profile", cascade="all, delete-orphan")
