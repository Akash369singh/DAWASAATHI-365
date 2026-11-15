from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, DoseLog, ActionToken, NotificationLog
from app.config import settings
from app.core.security import generate_action_token
from app.services.email_service import send_email, build_upcoming_dose_email

router = APIRouter(prefix="/api/demo", tags=["Demo & Testing Triggers"])


@router.post("/seed")
def trigger_seed(db: Session = Depends(get_db)):
    """Re-seed database with realistic demo data for judges."""
    from seed import seed_database
    res = seed_database(db)
    return res


@router.post("/trigger-reminder")
def trigger_instant_reminder(db: Session = Depends(get_db)):
    """Instantly trigger a reminder email with a live magic link for demonstration."""
    profile = db.query(Profile).filter(Profile.code == "CARE-7291").first()
    if not profile:
        from seed import seed_database
        seed_database(db)
        profile = db.query(Profile).filter(Profile.code == "CARE-7291").first()

    elder = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "ELDER").first()
    dose = db.query(DoseLog).filter(DoseLog.profile_id == profile.id, DoseLog.status == "PENDING").first()
    if not dose:
        dose = db.query(DoseLog).filter(DoseLog.profile_id == profile.id).first()

    now = datetime.now(timezone.utc)
    token_str = generate_action_token(dose.id, "TAKE_DOSE", elder.id)
    magic_url = f"{settings.FRONTEND_URL}/action?token={token_str}"

    subject, html_body, text_body = build_upcoming_dose_email(
        elder_name=profile.elder_name,
        med_name=dose.medication.name if dose.medication else "Metformin",
        dosage=dose.medication.dosage if dose.medication else "500 mg",
        instructions=dose.medication.instructions if dose.medication else "After food",
        scheduled_time_str="Right Now (Demo Test)",
        magic_take_url=magic_url,
    )

    send_email(elder.email, subject, html_body, text_body)

    return {
        "status": "sent",
        "recipient": elder.email,
        "subject": subject,
        "magic_link_url": magic_url,
        "dose_id": dose.id,
        "medication": dose.medication.name if dose.medication else "Metformin",
        "email_mode": settings.EMAIL_MODE,
        "note": "If EMAIL_MODE=console, check terminal logs to see the dispatched email body.",
    }


@router.post("/trigger-sos")
def trigger_demo_sos(db: Session = Depends(get_db)):
    """Instantly trigger a demo Emergency SOS with geolocation and magic link for evaluation."""
    from app.api.emergency import execute_sos_broadcast, SOSCreateRequest

    profile = db.query(Profile).filter(Profile.code == "CARE-7291").first()
    if not profile:
        from seed import seed_database
        seed_database(db)
        profile = db.query(Profile).filter(Profile.code == "CARE-7291").first()

    elder = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "ELDER").first()

    # Coordinates for Connaught Place / Delhi demo
    demo_payload = SOSCreateRequest(
        latitude=28.6328,
        longitude=77.2197,
        notes="Demo Emergency SOS Triggered (Evaluation Mode)",
    )

    result = execute_sos_broadcast(demo_payload, elder, profile, db)
    return result


@router.post("/trigger-weekly-digest")
def trigger_demo_weekly_digest(
    db: Session = Depends(get_db),
):
    """Feature 6: Instantly trigger weekly family digest email with adherence and Gemini summary."""
    from app.services.scheduler_service import send_weekly_family_digest

    profile = db.query(Profile).filter(Profile.code == "CARE-7291").first()
    if not profile:
        profile = db.query(Profile).first()

    return send_weekly_family_digest(db, profile.id, force=True)
