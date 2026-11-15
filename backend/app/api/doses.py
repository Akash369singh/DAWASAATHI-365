from datetime import datetime, date, time, timedelta, timezone
import zoneinfo
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, Medication, DoseLog, AuditLog
from app.schemas.dose import (
    DoseLogOut,
    DoseActionRequest,
    DoseSnoozeRequest,
    TodayScheduleOut,
    AdherenceStatsOut,
    DayAdherenceHeatmap,
)
from app.core.deps import get_current_member, get_current_profile
from app.services.scheduler_service import generate_missing_dose_logs

router = APIRouter(prefix="/api/doses", tags=["Dose Logs & Adherence"])


def ensure_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def format_dose_out(dose: DoseLog, user_tz: zoneinfo.ZoneInfo) -> DoseLogOut:
    local_dt = ensure_utc(dose.scheduled_at).astimezone(user_tz)
    now_utc = datetime.now(timezone.utc)
    snooze_utc = ensure_utc(dose.snoozed_until)
    is_snoozed = bool(snooze_utc and snooze_utc > now_utc)
    snooze_local_str = snooze_utc.astimezone(user_tz).strftime("%I:%M %p") if snooze_utc else None

    return DoseLogOut(
        id=dose.id,
        profile_id=dose.profile_id,
        medication_id=dose.medication_id,
        medication_name=dose.medication.name if dose.medication else "Unknown Medicine",
        dosage=dose.medication.dosage if dose.medication else "",
        form=dose.medication.form if dose.medication else "Tablet",
        instructions=dose.medication.instructions if dose.medication else "",
        scheduled_at=ensure_utc(dose.scheduled_at),
        scheduled_at_local=local_dt.strftime("%I:%M %p"),
        status=dose.status,
        acted_at=ensure_utc(dose.acted_at) if dose.acted_at else None,
        acted_by_member_id=dose.acted_by_member_id,
        acted_by_name=dose.actor.name if dose.actor else None,
        escalation_level=dose.escalation_level,
        snoozed_until=ensure_utc(dose.snoozed_until) if dose.snoozed_until else None,
        snoozed_until_local=snooze_local_str,
        snooze_count=dose.snooze_count or 0,
        is_snoozed=is_snoozed,
        notes=dose.notes,
    )


@router.get("/today", response_model=TodayScheduleOut)
def get_today_schedule(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve today's complete dose timeline, next due medication, and adherence progress."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    # Ensure dose logs are generated
    generate_missing_dose_logs(db, target_days_ahead=0)

    now_local = datetime.now(user_tz)
    today = now_local.date()

    start_local = datetime.combine(today, time.min, tzinfo=user_tz)
    end_local = datetime.combine(today, time.max, tzinfo=user_tz)

    start_utc = start_local.astimezone(timezone.utc)
    end_utc = end_local.astimezone(timezone.utc)

    all_doses = (
        db.query(DoseLog)
        .filter(DoseLog.profile_id == profile.id)
        .all()
    )

    doses = [
        d for d in all_doses
        if ensure_utc(d.scheduled_at).astimezone(user_tz).date() == today
    ]
    doses.sort(key=lambda x: ensure_utc(x.scheduled_at))

    formatted_doses = [format_dose_out(d, user_tz) for d in doses]

    total = len(formatted_doses)
    taken = sum(1 for d in formatted_doses if d.status == "TAKEN")
    pending = sum(1 for d in formatted_doses if d.status == "PENDING")
    missed = sum(1 for d in formatted_doses if d.status == "MISSED")
    adherence_pct = round((taken / total * 100.0), 1) if total > 0 else 100.0

    # Determine next due dose
    next_dose = None
    for d in formatted_doses:
        if d.status == "PENDING":
            next_dose = d
            break

    # Construct single status line for Home page
    if missed > 0:
        status_summary = f"{missed} dose(s) missed. Caregiver alerted."
    elif pending == 0 and total > 0:
        status_summary = f"All done for today! {elder_greeting(profile.elder_name)}"
    elif next_dose:
        status_summary = f"Next dose: {next_dose.medication_name} at {next_dose.scheduled_at_local}."
    else:
        status_summary = "All good. No pending doses right now."

    return TodayScheduleOut(
        today_date=today.strftime("%A, %B %d, %Y"),
        total_doses=total,
        completed_doses=taken,
        pending_doses=pending,
        missed_doses=missed,
        adherence_pct=adherence_pct,
        next_dose=next_dose,
        doses=formatted_doses,
        status_summary=status_summary,
    )


def elder_greeting(name: str) -> str:
    return f"Great job maintaining your health, {name}!"


@router.post("/{dose_id}/take")
def mark_dose_taken(
    dose_id: int,
    payload: Optional[DoseActionRequest] = None,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Mark a dose as TAKEN, log actor, and decrement pill stock."""
    dose = db.query(DoseLog).filter(DoseLog.id == dose_id, DoseLog.profile_id == profile.id).first()
    if not dose:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose log entry not found")

    now = datetime.now(timezone.utc)

    # 🚨 Clinical Safety Guard 1: Check if already taken
    if dose.status == "TAKEN" and not (payload and payload.confirm_duplicate):
        return {
            "status": "already_taken_warning",
            "warning": True,
            "message": f"This dose of {dose.medication.name if dose.medication else 'medicine'} was already recorded as taken. If an extra tablet was taken accidentally, please report an Emergency Medication Incident.",
            "dose_id": dose.id,
            "new_status": dose.status,
        }

    # 🚨 Clinical Safety Guard 2: Rapid Repeated Dose / Overdose Risk (within 60 mins)
    recent_take = (
        db.query(DoseLog)
        .filter(
            DoseLog.profile_id == profile.id,
            DoseLog.medication_id == dose.medication_id,
            DoseLog.status == "TAKEN",
            DoseLog.id != dose.id,
            DoseLog.acted_at >= now - timedelta(minutes=60),
        )
        .first()
    )
    if recent_take and not (payload and payload.confirm_duplicate):
        return {
            "status": "overdose_risk_warning",
            "warning": True,
            "message": f"Caution: A dose of {dose.medication.name if dose.medication else 'this medicine'} was already taken within the last 60 minutes. Taking another dose so quickly may cause an accidental overdose.",
            "dose_id": dose.id,
            "new_status": dose.status,
        }

    dose.status = "TAKEN"
    dose.acted_at = now
    dose.acted_by_member_id = member.id
    if payload and payload.notes:
        dose.notes = payload.notes

    # Decrement pill inventory
    if dose.medication and dose.medication.stock_count > 0:
        dose.medication.stock_count -= 1

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="DOSE_MARKED_TAKEN",
        details={
            "dose_id": dose.id,
            "medication": dose.medication.name if dose.medication else "Medicine",
            "acted_by_role": member.role,
        },
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Dose marked as taken by {member.name}",
        "dose_id": dose.id,
        "new_status": dose.status,
    }


@router.post("/{dose_id}/skip")
def mark_dose_skipped(
    dose_id: int,
    payload: Optional[DoseActionRequest] = None,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Mark a dose as SKIPPED with an optional reason."""
    dose = db.query(DoseLog).filter(DoseLog.id == dose_id, DoseLog.profile_id == profile.id).first()
    if not dose:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose log entry not found")

    now = datetime.now(timezone.utc)
    dose.status = "SKIPPED"
    dose.acted_at = now
    dose.acted_by_member_id = member.id
    if payload and payload.notes:
        dose.notes = payload.notes

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="DOSE_MARKED_SKIPPED",
        details={
            "dose_id": dose.id,
            "medication": dose.medication.name if dose.medication else "Medicine",
            "reason": payload.notes if payload else "Skipped by user",
        },
    ))
    db.commit()

    return {
        "status": "success",
        "message": "Dose recorded as skipped",
        "dose_id": dose.id,
        "new_status": dose.status,
    }


@router.post("/{dose_id}/snooze")
def snooze_dose(
    dose_id: int,
    payload: DoseSnoozeRequest = DoseSnoozeRequest(),
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """
    Feature 3: Running Late (Snooze).
    Choices: 15, 30, 60 minutes.
    Pauses escalation ladder, sends only one reminder at the new time.
    Max 2 snoozes allowed per dose.
    """
    if member.role not in ["ELDER", "CARETAKER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Elder or primary Caretaker can snooze a medication dose.",
        )

    dose = db.query(DoseLog).filter(DoseLog.id == dose_id, DoseLog.profile_id == profile.id).first()
    if not dose:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dose log entry not found")

    if dose.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot snooze dose that is already {dose.status}.",
        )

    current_snoozes = dose.snooze_count or 0
    if current_snoozes >= 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 2 snoozes reached for this medication dose. Please take or skip.",
        )

    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_utc = datetime.now(timezone.utc)
    snooze_target_utc = now_utc + timedelta(minutes=payload.minutes)
    snooze_local_str = snooze_target_utc.astimezone(user_tz).strftime("%I:%M %p")

    # Update dose
    dose.snoozed_until = snooze_target_utc
    dose.snooze_count = current_snoozes + 1
    dose.escalation_level = 0  # Pause escalation ladder!

    med_name = dose.medication.name if dose.medication else "Medicine"

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="DOSE_SNOOZED",
        details={
            "dose_id": dose.id,
            "medication": med_name,
            "minutes": payload.minutes,
            "snoozed_until_local": snooze_local_str,
            "snooze_count": dose.snooze_count,
        },
    ))
    db.commit()

    return {
        "status": "snoozed",
        "message": f"Reminder paused. {profile.elder_name} will take {med_name} at {snooze_local_str}.",
        "dose_id": dose.id,
        "minutes": payload.minutes,
        "is_snoozed": True,
        "snoozed_until": snooze_target_utc.isoformat(),
        "snoozed_until_local": snooze_local_str,
        "snooze_count": dose.snooze_count,
        "max_snoozes": 2,
    }


@router.get("/stats", response_model=AdherenceStatsOut)
def get_adherence_statistics(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Calculate adherence rings (Today, 7-Day, 30-Day) and 30-day interactive heatmap."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_local = datetime.now(user_tz)
    today = now_local.date()

    # 30-day window
    start_30d = today - timedelta(days=29)
    start_utc = datetime.combine(start_30d, time.min, tzinfo=user_tz).astimezone(timezone.utc)
    end_utc = datetime.combine(today, time.max, tzinfo=user_tz).astimezone(timezone.utc)

    all_logs = (
        db.query(DoseLog)
        .filter(DoseLog.profile_id == profile.id)
        .all()
    )

    # Filter logs within 30 days
    all_logs = [
        log for log in all_logs
        if start_30d <= ensure_utc(log.scheduled_at).astimezone(user_tz).date() <= today
    ]

    # Group by date
    days_map = {}
    for i in range(30):
        d_date = start_30d + timedelta(days=i)
        days_map[d_date.isoformat()] = {"total": 0, "taken": 0, "missed": 0, "skipped": 0}

    for log in all_logs:
        log_date = log.scheduled_at.astimezone(user_tz).date().isoformat()
        if log_date in days_map:
            days_map[log_date]["total"] += 1
            if log.status == "TAKEN":
                days_map[log_date]["taken"] += 1
            elif log.status == "MISSED":
                days_map[log_date]["missed"] += 1
            elif log.status == "SKIPPED":
                days_map[log_date]["skipped"] += 1

    heatmap: List[DayAdherenceHeatmap] = []
    total_30d = 0
    taken_30d = 0
    missed_30d = 0
    skipped_30d = 0

    total_7d = 0
    taken_7d = 0

    today_str = today.isoformat()
    start_7d_str = (today - timedelta(days=6)).isoformat()

    for d_str, counts in sorted(days_map.items()):
        t = counts["total"]
        tk = counts["taken"]
        m = counts["missed"]
        sk = counts["skipped"]
        pct = round((tk / t * 100.0), 1) if t > 0 else 100.0

        # Calculate heatmap intensity level (0 to 4)
        if t == 0:
            level = 0
        elif pct >= 95:
            level = 4
        elif pct >= 80:
            level = 3
        elif pct >= 50:
            level = 2
        else:
            level = 1

        heatmap.append(DayAdherenceHeatmap(
            date=d_str,
            total=t,
            taken=tk,
            missed=m,
            skipped=sk,
            adherence_pct=pct,
            level=level,
        ))

        total_30d += t
        taken_30d += tk
        missed_30d += m
        skipped_30d += sk

        if d_str >= start_7d_str:
            total_7d += t
            taken_7d += tk

    today_counts = days_map.get(today_str, {"total": 0, "taken": 0})
    today_pct = round((today_counts["taken"] / today_counts["total"] * 100.0), 1) if today_counts["total"] > 0 else 100.0
    seven_day_pct = round((taken_7d / total_7d * 100.0), 1) if total_7d > 0 else 100.0
    thirty_day_pct = round((taken_30d / total_30d * 100.0), 1) if total_30d > 0 else 100.0

    return AdherenceStatsOut(
        today_pct=today_pct,
        seven_day_pct=seven_day_pct,
        thirty_day_pct=thirty_day_pct,
        total_scheduled_30d=total_30d,
        total_taken_30d=taken_30d,
        total_missed_30d=missed_30d,
        total_skipped_30d=skipped_30d,
        heatmap=heatmap,
    )
