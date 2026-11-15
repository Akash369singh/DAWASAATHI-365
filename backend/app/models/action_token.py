from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class ActionToken(Base):
    __tablename__ = "action_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(512), unique=True, index=True, nullable=False)
    action_type = Column(String(40), nullable=False, default="TAKE_DOSE")  # TAKE_DOSE, SKIP_DOSE
    ref_id = Column(Integer, nullable=False, index=True)  # dose_log.id
    
    profile_id = Column(Integer, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(Integer, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)
    
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    profile = relationship("Profile", back_populates="action_tokens")
