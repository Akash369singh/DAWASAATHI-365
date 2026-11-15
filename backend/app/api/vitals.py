from typing import List, Optional
from datetime import datetime, timezone
import zoneinfo
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, HealthVital, AuditLog
from app.schemas.vital import VitalCreate, VitalOut
from app.core.deps import get_current_member, get_current_profile

router = APIRouter(prefix="/api/vitals", tags=["Health Vitals"])


def format_vital_out(v: HealthVital, user_tz: zoneinfo.ZoneInfo) -> VitalOut:
    local_dt = v.recorded_at.astimezone(user_tz)
    return VitalOut(
        id=v.id,
        profile_id=v.profile_id,
        vital_type=v.vital_type,
        value_numeric=v.value_numeric,
        value_secondary=v.value_secondary,
        unit=v.unit,
        context=v.context,
        notes=v.notes,
        recorded_at=v.recorded_at,
        recorded_at_local=local_dt.strftime("%b %d, %I:%M %p"),
        created_at=v.created_at,
    )


@router.get("", response_model=List[VitalOut])
def list_vitals(
    vital_type: Optional[str] = None,
    limit: int = 50,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve logged health vitals (BP, glucose, SpO2, heart rate, weight)."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    query = db.query(HealthVital).filter(HealthVital.profile_id == profile.id)
    if vital_type:
        query = query.filter(HealthVital.vital_type == vital_type.upper())

    results = query.order_by(HealthVital.recorded_at.desc()).limit(limit).all()
    return [format_vital_out(v, user_tz) for v in results]


@router.post("", response_model=VitalOut, status_code=status.HTTP_201_CREATED)
def record_vital(
    payload: VitalCreate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Log a health vital measurement."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    recorded_dt = payload.recorded_at or datetime.now(timezone.utc)
    if recorded_dt.tzinfo is None:
        recorded_dt = recorded_dt.replace(tzinfo=user_tz).astimezone(timezone.utc)
    else:
        recorded_dt = recorded_dt.astimezone(timezone.utc)

    vital = HealthVital(
        profile_id=profile.id,
        vital_type=payload.vital_type,
        value_numeric=payload.value_numeric,
        value_secondary=payload.value_secondary,
        unit=payload.unit,
        context=payload.context,
        notes=payload.notes,
        recorded_at=recorded_dt,
    )
    db.add(vital)
    db.flush()

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="VITAL_RECORDED",
        details={
            "type": vital.vital_type,
            "value": vital.value_numeric,
            "value_sec": vital.value_secondary,
            "unit": vital.unit,
        },
    ))
    db.commit()
    db.refresh(vital)

    return format_vital_out(vital, user_tz)
