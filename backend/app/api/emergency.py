from datetime import datetime, timezone, timedelta
import zoneinfo
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Profile, Member, AuditLog, NotificationLog, SOSEvent, ActionToken
from app.core.deps import get_current_member, get_current_profile
from app.core.security import generate_action_token
from app.services.email_service import (
    send_email,
    build_emergency_sos_email,
    build_sos_ack_notification_email,
)

# Route handlers mapped to /api/sos and /api/emergency/sos
router = APIRouter(tags=["Emergency SOS"])


def ensure_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class SOSCreateRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = "Emergency SOS button triggered from DawaSaathi 365 App"


class SOSStatusOut(BaseModel):
    id: int
    profile_id: int
    triggered_by: str
    triggered_by_role: Optional[str] = None
    status: str  # OPEN, ACK, RESOLVED
    created_at: datetime
    created_at_local: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    maps_url: Optional[str] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None


def format_sos_out(sos: SOSEvent, user_tz: zoneinfo.ZoneInfo) -> SOSStatusOut:
    created_utc = ensure_utc(sos.created_at)
    local_str = created_utc.astimezone(user_tz).strftime("%I:%M %p on %A, %b %d")
    maps_url = f"https://maps.google.com/?q={sos.latitude},{sos.longitude}" if (sos.latitude and sos.longitude) else None

    return SOSStatusOut(
        id=sos.id,
        profile_id=sos.profile_id,
        triggered_by=sos.triggered_by,
        triggered_by_role=sos.triggered_by_member.role if sos.triggered_by_member else None,
        status=sos.status,
        created_at=created_utc,
        created_at_local=local_str,
        latitude=sos.latitude,
        longitude=sos.longitude,
        maps_url=maps_url,
        acknowledged_by=sos.acknowledged_by,
        acknowledged_at=ensure_utc(sos.acknowledged_at),
        resolved_by=sos.resolved_by,
        resolved_at=ensure_utc(sos.resolved_at),
        notes=sos.notes,
    )


def execute_sos_broadcast(
    payload: SOSCreateRequest,
    member: Member,
    profile: Profile,
    db: Session,
):
    # Rule: Elder and caretaker can trigger SOS
    if member.role not in ["ELDER", "CARETAKER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Elder or primary Caretaker can trigger Emergency SOS.",
        )

    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_utc = datetime.now(timezone.utc)
    now_local_str = now_utc.astimezone(user_tz).strftime("%I:%M %p on %A, %b %d")

    # 1. Create SOSEvent
    sos = SOSEvent(
        profile_id=profile.id,
        triggered_by=f"{member.name} ({member.role})",
        triggered_by_member_id=member.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="OPEN",
        notes=payload.notes,
        created_at=now_utc,
    )
    db.add(sos)
    db.flush()

    maps_url = f"https://maps.google.com/?q={payload.latitude},{payload.longitude}" if (payload.latitude and payload.longitude) else None

    # 2. Find ALL members flagged as emergency contacts
    # Default: All active members except the one who triggered
    recipients = (
        db.query(Member)
        .filter(
            Member.profile_id == profile.id,
            Member.is_active.is_(True),
            Member.id != member.id,
        )
        .all()
    )

    alerted = []
    for rec in recipients:
        if not rec.email:
            continue

        # Generate single-use signed magic link: "I'm on it / Acknowledge"
        magic_token = generate_action_token(
            action="ACK_SOS",
            sos_event_id=sos.id,
            member_id=rec.id,
        )

        db.add(ActionToken(
            profile_id=profile.id,
            member_id=rec.id,
            token_hash=magic_token,
            action_type="ACK_SOS",
            ref_id=sos.id,
            expires_at=now_utc + timedelta(hours=24),
        ))

        magic_ack_url = f"{settings.FRONTEND_URL}/api/actions/execute/{magic_token}"

        subject, html_body, text_body = build_emergency_sos_email(
            elder_name=profile.elder_name,
            recipient_name=rec.name,
            emergency_timestamp=now_local_str,
            triggered_by=f"{member.name} ({member.role})",
            maps_url=maps_url,
            magic_ack_url=magic_ack_url,
            notes=payload.notes,
            is_escalation=False,
        )

        if send_email(rec.email, subject, html_body, text_body):
            alerted.append({"name": rec.name, "role": rec.role, "email": rec.email})
            db.add(NotificationLog(
                profile_id=profile.id,
                notification_type="EMERGENCY_SOS",
                ref_id=sos.id,
                recipient_email=rec.email,
                recipient_role=rec.role,
                subject=subject,
                message_body=text_body,
            ))

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="EMERGENCY_SOS_TRIGGERED",
        details={
            "sos_id": sos.id,
            "triggered_by": member.name,
            "lat": payload.latitude,
            "lng": payload.longitude,
            "contacts_alerted": len(alerted),
        },
    ))
    db.commit()
    db.refresh(sos)

    return {
        "status": "sos_active",
        "message": f"🚨 Emergency SOS broadcast sent to {len(alerted)} emergency contacts!",
        "sos_id": sos.id,
        "elder_name": profile.elder_name,
        "triggered_by": member.name,
        "timestamp": now_local_str,
        "maps_url": maps_url,
        "contacts_alerted": alerted,
    }


# Route handlers mapped to /sos, /api/sos, and /api/emergency/sos
@router.post("/sos")
@router.post("/api/sos")
@router.post("/api/emergency/sos")
def trigger_sos(
    payload: SOSCreateRequest = SOSCreateRequest(),
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Trigger emergency SOS broadcast to all circle emergency contacts."""
    return execute_sos_broadcast(payload, member, profile, db)


@router.get("/sos/active", response_model=Optional[SOSStatusOut])
@router.get("/api/sos/active", response_model=Optional[SOSStatusOut])
@router.get("/api/emergency/sos/active", response_model=Optional[SOSStatusOut])
def get_active_sos(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve any current active (OPEN or ACK) Emergency SOS for persistent banner."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    active_sos = (
        db.query(SOSEvent)
        .filter(
            SOSEvent.profile_id == profile.id,
            SOSEvent.status.in_(["OPEN", "ACK"]),
        )
        .order_by(SOSEvent.created_at.desc())
        .first()
    )

    if not active_sos:
        return None

    return format_sos_out(active_sos, user_tz)


@router.post("/sos/{sos_id}/ack")
@router.post("/api/sos/{sos_id}/ack")
@router.post("/api/emergency/sos/{sos_id}/ack")
def acknowledge_sos(
    sos_id: int,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Authenticated member marks SOS as acknowledged ('I am on it')."""
    sos = db.query(SOSEvent).filter(
        SOSEvent.id == sos_id,
        SOSEvent.profile_id == profile.id,
    ).first()

    if not sos:
        raise HTTPException(status_code=404, detail="SOS event not found")

    if sos.status == "RESOLVED":
        return {"status": "already_resolved", "message": "SOS is already resolved."}

    now_utc = datetime.now(timezone.utc)
    sos.status = "ACK"
    sos.acknowledged_at = now_utc
    sos.acknowledged_by = member.name
    sos.acknowledged_by_member_id = member.id

    # Notify other members
    ack_time_str = now_utc.strftime("%I:%M %p UTC")
    other_members = db.query(Member).filter(
        Member.profile_id == profile.id,
        Member.id != member.id,
        Member.is_active.is_(True),
    ).all()

    for om in other_members:
        if om.email:
            sub, html, txt = build_sos_ack_notification_email(
                elder_name=profile.elder_name,
                recipient_name=om.name,
                responder_name=member.name,
                ack_time_str=ack_time_str,
            )
            send_email(om.email, sub, html, txt)

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="EMERGENCY_SOS_ACKNOWLEDGED",
        details={"sos_id": sos.id, "acknowledged_by": member.name, "channel": "in_app"},
    ))
    db.commit()

    return {
        "status": "acknowledged",
        "message": f"You have acknowledged {profile.elder_name}'s SOS. Other members notified.",
        "acknowledged_by": member.name,
    }


@router.post("/sos/{sos_id}/resolve")
@router.post("/api/sos/{sos_id}/resolve")
@router.post("/api/emergency/sos/{sos_id}/resolve")
def resolve_sos(
    sos_id: int,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Mark SOS as RESOLVED and dismiss persistent banner."""
    sos = db.query(SOSEvent).filter(
        SOSEvent.id == sos_id,
        SOSEvent.profile_id == profile.id,
    ).first()

    if not sos:
        raise HTTPException(status_code=404, detail="SOS event not found")

    now_utc = datetime.now(timezone.utc)
    sos.status = "RESOLVED"
    sos.resolved_at = now_utc
    sos.resolved_by = member.name

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="EMERGENCY_SOS_RESOLVED",
        details={"sos_id": sos.id, "resolved_by": member.name},
    ))
    db.commit()

    return {
        "status": "resolved",
        "message": f"SOS has been safely resolved by {member.name}. Banner dismissed.",
    }
