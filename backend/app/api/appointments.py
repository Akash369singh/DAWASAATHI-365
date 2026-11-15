from typing import List, Optional
from datetime import datetime, timezone
import zoneinfo
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, Appointment, AuditLog
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentOut
from app.core.deps import get_current_member, get_current_profile

router = APIRouter(prefix="/api/appointments", tags=["Doctor Appointments"])


def ensure_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def format_apt_out(apt: Appointment, user_tz: zoneinfo.ZoneInfo) -> AppointmentOut:
    local_dt = ensure_utc(apt.scheduled_datetime).astimezone(user_tz)
    return AppointmentOut(
        id=apt.id,
        profile_id=apt.profile_id,
        doctor_name=apt.doctor_name,
        specialty=apt.specialty,
        location=apt.location,
        scheduled_datetime=apt.scheduled_datetime,
        scheduled_datetime_local=local_dt.strftime("%A, %b %d at %I:%M %p"),
        notes=apt.notes,
        status=apt.status,
        created_at=apt.created_at,
        updated_at=apt.updated_at,
    )


@router.get("", response_model=List[AppointmentOut])
def list_appointments(
    upcoming_only: bool = False,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """List medical appointments for the DawaSaathi 365 profile."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    apts = db.query(Appointment).filter(Appointment.profile_id == profile.id).all()
    if upcoming_only:
        now_utc = datetime.now(timezone.utc)
        apts = [a for a in apts if ensure_utc(a.scheduled_datetime) >= now_utc and a.status == "SCHEDULED"]

    apts.sort(key=lambda a: ensure_utc(a.scheduled_datetime))
    return [format_apt_out(a, user_tz) for a in apts]


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Schedule a new doctor visit."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    # Ensure scheduled datetime is UTC aware
    dt = payload.scheduled_datetime
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=user_tz).astimezone(timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)

    apt = Appointment(
        profile_id=profile.id,
        doctor_name=payload.doctor_name,
        specialty=payload.specialty,
        location=payload.location,
        scheduled_datetime=dt,
        notes=payload.notes,
        status=payload.status,
    )
    db.add(apt)
    db.flush()

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="APPOINTMENT_SCHEDULED",
        details={"doctor": apt.doctor_name, "specialty": apt.specialty, "time": dt.isoformat()},
    ))
    db.commit()
    db.refresh(apt)

    return format_apt_out(apt, user_tz)


@router.put("/{apt_id}", response_model=AppointmentOut)
def update_appointment(
    apt_id: int,
    payload: AppointmentUpdate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Update appointment details."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    apt = db.query(Appointment).filter(Appointment.id == apt_id, Appointment.profile_id == profile.id).first()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    update_dict = payload.model_dump(exclude_unset=True)
    if "scheduled_datetime" in update_dict and update_dict["scheduled_datetime"]:
        dt = update_dict["scheduled_datetime"]
        if dt.tzinfo is None:
            update_dict["scheduled_datetime"] = dt.replace(tzinfo=user_tz).astimezone(timezone.utc)
        else:
            update_dict["scheduled_datetime"] = dt.astimezone(timezone.utc)

    for field, val in update_dict.items():
        setattr(apt, field, val)

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="APPOINTMENT_UPDATED",
        details={"apt_id": apt.id, "doctor": apt.doctor_name},
    ))
    db.commit()
    db.refresh(apt)

    return format_apt_out(apt, user_tz)


@router.delete("/{apt_id}")
def delete_appointment(
    apt_id: int,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Cancel or remove an appointment."""
    apt = db.query(Appointment).filter(Appointment.id == apt_id, Appointment.profile_id == profile.id).first()
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    doc = apt.doctor_name
    db.delete(apt)
    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="APPOINTMENT_DELETED",
        details={"doctor": doc},
    ))
    db.commit()

    return {"status": "success", "message": f"Appointment with {doc} removed"}
