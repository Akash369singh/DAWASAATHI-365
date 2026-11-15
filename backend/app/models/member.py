from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    role = Column(String(20), nullable=False, default="FAMILY")  # ELDER, CARETAKER, FAMILY
    passcode_hash = Column(String(255), nullable=False)
    
    # Permissions configured by elder / caretaker
    # Defaults:
    # can_edit_meds (ELDER & CARETAKER: true; FAMILY: false unless granted)
    # view_all_meds (true)
    # view_appointments (true)
    # receive_missed_alerts (true)
    permissions = Column(JSON, default=dict)
    
    # Security: lockout after 5 consecutive failed login attempts
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="members")
    dose_actions = relationship("DoseLog", back_populates="actor", foreign_keys="DoseLog.acted_by_member_id")
    audit_logs = relationship("AuditLog", back_populates="member")
