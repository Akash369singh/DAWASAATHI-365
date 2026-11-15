from datetime import datetime, date, timedelta, timezone
import zoneinfo
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.models import Profile, Member, CheckIn, AuditLog, NotificationLog, ActionToken
from app.core.deps import get_current_member, get_current_profile
from app.core.security import generate_action_token
from app.services.email_service import (
    send_email,
    build_daily_checkin_email,
    build_checkin_caretaker_notice_email,
)

router = APIRouter(prefix="/api/checkins", tags=["Feature 4: Daily Check-in"])


class CheckInRequest(BaseModel):
    mood: str = Field(..., pattern="^(GOOD|OKAY|NOT_WELL)$")
    note: Optional[str] = None


class CheckInOut(BaseModel):
    id: int
    profile_id: int
    mood: str
    note: Optional[str] = None
    checkin_date: date
    created_at: datetime


@router.post("", response_model=CheckInOut)
def submit_daily_checkin(
    payload: CheckInRequest,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """
    Feature 4: Submit daily check-in (Good / Okay / Not well).
    Enforces 1 check-in per day per profile.
    Notifies caretaker neutrally if 'Not well' is chosen or 3 of last 5 days are Okay/Not well.
    """
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_utc = datetime.now(timezone.utc)
    today_local = now_utc.astimezone(user_tz).date()

    # Check if already submitted today
    existing = (
        db.query(CheckIn)
        .filter(CheckIn.profile_id == profile.id, CheckIn.checkin_date == today_local)
        .first()
    )

    if existing:
        existing.mood = payload.mood
        existing.note = payload.note
        existing.member_id = member.id
        db.commit()
        db.refresh(existing)
        checkin_obj = existing
    else:
        checkin_obj = CheckIn(
            profile_id=profile.id,
            member_id=member.id,
            mood=payload.mood,
            note=payload.note,
            checkin_date=today_local,
            created_at=now_utc,
        )
        db.add(checkin_obj)
        db.commit()
        db.refresh(checkin_obj)

    # Audit log
    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="DAILY_CHECKIN_SUBMITTED",
        details={"mood": payload.mood, "note": payload.note, "date": str(today_local)},
    ))
    db.commit()

    # Feature 4 Rule: Evaluate caretaker alert conditions
    # 1. "Not well" chosen today OR
    # 2. 3 of the last 5 days are "Okay" or "Not well"
    last_5_days_checkins = (
        db.query(CheckIn)
        .filter(
            CheckIn.profile_id == profile.id,
            CheckIn.checkin_date >= today_local - timedelta(days=5),
        )
        .order_by(CheckIn.checkin_date.desc())
        .all()
    )

    unwell_count = sum(1 for c in last_5_days_checkins if c.mood in ["OKAY", "NOT_WELL"])
    
    caretakers = (
        db.query(Member)
        .filter(
            Member.profile_id == profile.id,
            Member.role.in_(["CARETAKER", "FAMILY"]),
            Member.is_active.is_(True),
            Member.id != member.id,
        )
        .all()
    )

    if payload.mood == "NOT_WELL":
        msg = f"{profile.elder_name} reported not feeling well today ({payload.note or 'No extra note'})."
        for ct in caretakers:
            if ct.email:
                sub, html, txt = build_checkin_caretaker_notice_email(
                    elder_name=profile.elder_name,
                    recipient_name=ct.name,
                    message_text=msg,
                )
                send_email(ct.email, sub, html, txt)
                db.add(NotificationLog(
                    profile_id=profile.id,
                    notification_type="CHECKIN_ALERT_NOT_WELL",
                    recipient_email=ct.email,
                    recipient_role=ct.role,
                    subject=sub,
                    message_body=txt,
                ))
        db.commit()
    elif unwell_count >= 3:
        msg = f"{profile.elder_name} reported feeling 'Okay' or 'Not well' {unwell_count} times over the past 5 days."
        for ct in caretakers:
            if ct.email:
                sub, html, txt = build_checkin_caretaker_notice_email(
                    elder_name=profile.elder_name,
                    recipient_name=ct.name,
                    message_text=msg,
                )
                send_email(ct.email, sub, html, txt)
                db.add(NotificationLog(
                    profile_id=profile.id,
                    notification_type="CHECKIN_TREND_NOTICE",
                    recipient_email=ct.email,
                    recipient_role=ct.role,
                    subject=sub,
                    message_body=txt,
                ))
        db.commit()

    return checkin_obj


@router.get("/today", response_model=Optional[CheckInOut])
def get_today_checkin(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Check if elder has already completed their check-in today."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_utc = datetime.now(timezone.utc)
    today_local = now_utc.astimezone(user_tz).date()

    checkin = (
        db.query(CheckIn)
        .filter(CheckIn.profile_id == profile.id, CheckIn.checkin_date == today_local)
        .first()
    )
    return checkin


@router.get("/history", response_model=List[CheckInOut])
def get_checkin_history(
    days: int = 14,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve 14-day check-in wellbeing strip history."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_utc = datetime.now(timezone.utc)
    today_local = now_utc.astimezone(user_tz).date()
    since_date = today_local - timedelta(days=days)

    checkins = (
        db.query(CheckIn)
        .filter(CheckIn.profile_id == profile.id, CheckIn.checkin_date >= since_date)
        .order_by(CheckIn.checkin_date.asc())
        .all()
    )
    return checkins


@router.post("/send-prompt")
def send_checkin_prompt_email(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """
    Sends the daily check-in email with signed 1-click magic links for Good / Okay / Not well.
    """
    elder = (
        db.query(Member)
        .filter(Member.profile_id == profile.id, Member.role == "ELDER", Member.is_active.is_(True))
        .first()
    )
    if not elder or not elder.email:
        raise HTTPException(status_code=400, detail="No elder registered with an active email address.")

    now_utc = datetime.now(timezone.utc)

    # Generate 3 single-use signed magic links for Good / Okay / Not Well
    token_good = generate_action_token(action="CHECKIN", mood="GOOD", profile_id=profile.id, member_id=elder.id)
    token_okay = generate_action_token(action="CHECKIN", mood="OKAY", profile_id=profile.id, member_id=elder.id)
    token_not_well = generate_action_token(action="CHECKIN", mood="NOT_WELL", profile_id=profile.id, member_id=elder.id)

    db.add(ActionToken(
        profile_id=profile.id,
        member_id=elder.id,
        token_hash=token_good,
        action_type="CHECKIN_GOOD",
        ref_id=0,
        expires_at=now_utc + timedelta(hours=24),
    ))
    db.add(ActionToken(
        profile_id=profile.id,
        member_id=elder.id,
        token_hash=token_okay,
        action_type="CHECKIN_OKAY",
        ref_id=0,
        expires_at=now_utc + timedelta(hours=24),
    ))
    db.add(ActionToken(
        profile_id=profile.id,
        member_id=elder.id,
        token_hash=token_not_well,
        action_type="CHECKIN_NOT_WELL",
        ref_id=0,
        expires_at=now_utc + timedelta(hours=24),
    ))
    db.commit()

    good_url = f"{settings.FRONTEND_URL}/api/actions/execute/{token_good}"
    okay_url = f"{settings.FRONTEND_URL}/api/actions/execute/{token_okay}"
    not_well_url = f"{settings.FRONTEND_URL}/api/actions/execute/{token_not_well}"

    subject, html_body, text_body = build_daily_checkin_email(
        elder_name=profile.elder_name,
        good_url=good_url,
        okay_url=okay_url,
        not_well_url=not_well_url,
    )

    sent = send_email(elder.email, subject, html_body, text_body)

    db.add(NotificationLog(
        profile_id=profile.id,
        notification_type="DAILY_CHECKIN_PROMPT",
        recipient_email=elder.email,
        recipient_role="ELDER",
        subject=subject,
        message_body=text_body,
    ))
    db.commit()

    return {
        "status": "sent",
        "message": f"Daily check-in email dispatched to {elder.name} ({elder.email})",
        "elder_name": profile.elder_name,
    }
