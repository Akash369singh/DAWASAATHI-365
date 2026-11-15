from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class NotificationLog(Base):
    __tablename__ = "notifications_log"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Types: DOSE_UPCOMING, DOSE_MISSED, ESCALATION_CARETAKER, ESCALATION_FAMILY, APPOINTMENT_24H, APPOINTMENT_2H
    notification_type = Column(String(50), nullable=False, index=True)
    
    # ref_id is dose_log.id or appointment.id
    ref_id = Column(Integer, nullable=False, index=True)
    
    recipient_email = Column(String(150), nullable=False, index=True)
    recipient_role = Column(String(20), nullable=True)  # ELDER, CARETAKER, FAMILY
    subject = Column(String(255), nullable=True)
    message_body = Column(Text, nullable=True)
    
    # Status: SENT, FAILED
    status = Column(String(20), nullable=False, default="SENT")
    sent_at = Column(DateTime(timezone=True), default=utc_now)

    # Unique constraint prevents ever re-sending the same notification type for the same entity to the same person
    __table_args__ = (
        UniqueConstraint("notification_type", "ref_id", "recipient_email", name="uq_notification_dedupe"),
    )

    # Relationships
    profile = relationship("Profile", back_populates="notifications")
