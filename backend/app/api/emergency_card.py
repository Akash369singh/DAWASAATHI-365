import secrets
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Profile, Member, Medication, Appointment, AuditLog
from app.core.deps import get_current_member, get_current_profile

router = APIRouter(prefix="/api/emergency-card", tags=["Emergency QR Card"])

# In-memory rate limiting for public emergency card scans: max 30 views per minute per IP
_rate_limits = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
MAX_REQUESTS_PER_WINDOW = 30


def is_rate_limited(client_ip: str) -> bool:
    now = time.time()
    timestamps = [t for t in _rate_limits[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(timestamps) >= MAX_REQUESTS_PER_WINDOW:
        return True
    timestamps.append(now)
    _rate_limits[client_ip] = timestamps
    return False


DEFAULT_EXPOSED_FIELDS = {
    "name": True,
    "blood_group": False,
    "allergies": True,
    "current_medicines": True,
    "doctor": False,
    "emergency_contacts": True,
}


class EmergencyCardSettingsUpdate(BaseModel):
    is_enabled: bool
    exposed_fields: Dict[str, bool] = Field(default_factory=lambda: DEFAULT_EXPOSED_FIELDS)
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_notes: Optional[str] = None


class EmergencyCardSettingsOut(BaseModel):
    is_enabled: bool
    token: Optional[str] = None
    public_url: Optional[str] = None
    exposed_fields: Dict[str, bool]
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    emergency_notes: Optional[str] = None
    last_viewed_at: Optional[str] = None


@router.get("/settings", response_model=EmergencyCardSettingsOut)
def get_emergency_card_settings(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve the emergency QR card configuration and exposed privacy fields."""
    token = profile.emergency_card_token
    public_url = f"{settings.FRONTEND_URL}/e/{token}" if (token and profile.emergency_card_enabled) else None

    # Get last public view timestamp from audit log
    last_view_log = (
        db.query(AuditLog)
        .filter(
            AuditLog.profile_id == profile.id,
            AuditLog.action == "EMERGENCY_CARD_VIEWED",
        )
        .order_by(AuditLog.created_at.desc())
        .first()
    )

    fields = profile.emergency_card_fields or DEFAULT_EXPOSED_FIELDS

    return EmergencyCardSettingsOut(
        is_enabled=bool(profile.emergency_card_enabled),
        token=token,
        public_url=public_url,
        exposed_fields=fields,
        blood_group=profile.blood_group,
        allergies=profile.allergies,
        emergency_notes=profile.emergency_notes,
        last_viewed_at=last_view_log.created_at.isoformat() if last_view_log else None,
    )


@router.post("/settings", response_model=EmergencyCardSettingsOut)
def update_emergency_card_settings(
    payload: EmergencyCardSettingsUpdate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Update emergency card toggle, exposed fields, blood group, and allergies."""
    if member.role not in ["ELDER", "CARETAKER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Elder or primary Caretaker can configure Emergency Card privacy.",
        )

    profile.emergency_card_enabled = payload.is_enabled
    profile.emergency_card_fields = payload.exposed_fields

    if payload.blood_group is not None:
        profile.blood_group = payload.blood_group.strip().upper()
    if payload.allergies is not None:
        profile.allergies = payload.allergies.strip()
    if payload.emergency_notes is not None:
        profile.emergency_notes = payload.emergency_notes.strip()

    # If enabled for the first time, generate unguessable token
    if payload.is_enabled and not profile.emergency_card_token:
        profile.emergency_card_token = secrets.token_urlsafe(24)

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="EMERGENCY_CARD_SETTINGS_UPDATED",
        details={
            "enabled": payload.is_enabled,
            "exposed_fields": payload.exposed_fields,
        },
    ))
    db.commit()
    db.refresh(profile)

    return get_emergency_card_settings(member, profile, db)


@router.post("/regenerate-token")
def regenerate_emergency_card_token(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Elder revokes the old emergency URL and generates a new unguessable token."""
    if member.role not in ["ELDER", "CARETAKER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Elder or primary Caretaker can regenerate the Emergency QR token.",
        )

    old_token = profile.emergency_card_token
    new_token = secrets.token_urlsafe(24)
    profile.emergency_card_token = new_token
    profile.emergency_card_enabled = True

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="EMERGENCY_CARD_TOKEN_REGENERATED",
        details={"revoked_token_prefix": old_token[:6] if old_token else "none"},
    ))
    db.commit()

    return {
        "status": "success",
        "message": "Old emergency link revoked! New token generated.",
        "token": new_token,
        "public_url": f"{settings.FRONTEND_URL}/e/{new_token}",
    }


# ==============================================================================
# PUBLIC READ-ONLY EMERGENCY CARD VIEW (Rate-limited, Noindex, Zero PII Logging)
# ==============================================================================
@router.get("/public/{token}")
def get_public_emergency_card(
    token: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Public emergency page for first responders & emergency services.
    - Read-only
    - No login required
    - Rate limited to 30 req/min per IP
    - Strict noindex headers
    - Logs time-only audit trail without viewer PII
    """
    client_ip = request.client.host if request.client else "unknown"
    if is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many emergency card requests. Please try again shortly.",
        )

    # Set strict noindex and no-cache headers for emergency privacy
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"

    profile = (
        db.query(Profile)
        .filter(
            Profile.emergency_card_token == token,
            Profile.emergency_card_enabled.is_(True),
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency Medical Card not found or has been disabled by the patient.",
        )

    # Log public view to audit_log (time only, NO PII from viewer as per instructions)
    db.add(AuditLog(
        profile_id=profile.id,
        member_id=None,
        actor_name="Emergency First Responder / QR View",
        action="EMERGENCY_CARD_VIEWED",
        details={"viewed_at": datetime.now(timezone.utc).isoformat()},
    ))
    db.commit()

    fields = profile.emergency_card_fields or DEFAULT_EXPOSED_FIELDS

    # Build response strictly based on elder-permitted fields
    data: Dict[str, Any] = {
        "is_valid": True,
        "token": token,
        "card_title": f"DawaSaathi 365 Emergency Medical Card",
        "verified_platform": "DawaSaathi 365 Connected Care",
    }

    if fields.get("name", True):
        data["patient"] = {
            "name": profile.elder_name,
            "age": profile.elder_age,
        }

    if fields.get("blood_group", False):
        data["blood_group"] = profile.blood_group or "Not specified"

    if fields.get("allergies", True):
        data["allergies"] = profile.allergies or "No known drug allergies reported"

    if fields.get("current_medicines", True):
        meds = (
            db.query(Medication)
            .filter(Medication.profile_id == profile.id, Medication.is_active.is_(True))
            .all()
        )
        data["current_medicines"] = [
            {
                "name": m.name,
                "dosage": m.dosage,
                "form": m.form,
                "instructions": m.instructions,
                "schedule_times": m.schedule_times,
            }
            for m in meds
        ]

    if fields.get("doctor", False):
        latest_apt = (
            db.query(Appointment)
            .filter(Appointment.profile_id == profile.id)
            .order_by(Appointment.scheduled_datetime.desc())
            .first()
        )
        if latest_apt:
            data["doctor"] = {
                "name": latest_apt.doctor_name,
                "specialty": latest_apt.specialty,
                "location": latest_apt.location,
            }
        else:
            data["doctor"] = None

    if fields.get("emergency_contacts", True):
        contacts = (
            db.query(Member)
            .filter(
                Member.profile_id == profile.id,
                Member.is_active.is_(True),
                Member.role.in_(["CARETAKER", "FAMILY"]),
            )
            .all()
        )
        data["emergency_contacts"] = [
            {
                "name": c.name,
                "role": c.role,
                "phone": c.phone,
                "email": c.email,
            }
            for c in contacts
        ]

    if profile.emergency_notes:
        data["emergency_notes"] = profile.emergency_notes

    return data
