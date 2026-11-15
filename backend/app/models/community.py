from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class FamilyMessage(Base):
    __tablename__ = "family_messages"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_member_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    
    sender_name = Column(String(100), nullable=False)
    sender_role = Column(String(20), nullable=False, default="FAMILY")  # CARETAKER, FAMILY, ELDER
    
    message_text = Column(Text, nullable=False)
    # Types: LOVING_NOTE, MED_NUDGE, TASK_ALERT, VOICE_NOTE
    message_type = Column(String(40), default="LOVING_NOTE")
    
    # Urgent flag triggers prominent alert on Dada ji's screen
    is_urgent = Column(Boolean, default=False)
    
    # Dada ji acknowledgment
    is_read_by_elder = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    reactions = Column(String(50), default="❤️")  # Heart reaction when Dada ji acknowledges
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="family_messages")
