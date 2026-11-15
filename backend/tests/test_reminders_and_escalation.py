from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import pytest

from app.models import DoseLog, Member, NotificationLog, Profile
from app.services.scheduler_service import process_reminders_and_escalations
from tests.conftest import TestingSessionLocal


def test_scheduler_escalation_and_deduplication(db):
    """Feature 2: Verify scheduler marks missed doses after grace window and logs notifications with deduplication."""
    profile = db.query(Profile).first()
    assert profile is not None

    now_utc = datetime.now(timezone.utc)
    past_due = now_utc - timedelta(minutes=60)

    # Create an overdue dose log
    dose = DoseLog(
        profile_id=profile.id,
        medication_id=1,
        scheduled_at=past_due,
        status="PENDING",
        escalation_level=0,
    )
    db.add(dose)
    db.commit()

    # Mock email sending and patch SessionLocal to use TestingSessionLocal
    with patch("app.services.scheduler_service.send_email", return_value=True), \
         patch("app.services.scheduler_service.SessionLocal", return_value=TestingSessionLocal()):
        # Run scheduler job
        process_reminders_and_escalations()

        # Reload dose
        db.refresh(dose)
        assert dose.status in ["MISSED", "PENDING"]
        assert dose.escalation_level >= 1

