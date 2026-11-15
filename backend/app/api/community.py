from datetime import datetime, timezone
import zoneinfo
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, Medication, DoseLog, CareTask, CareTaskLog, HealthVital, FamilyMessage, AuditLog
from app.core.deps import get_current_member, get_current_profile
from app.services.email_service import send_email

router = APIRouter(prefix="/api/community", tags=["Family Community & Live Watch"])


def ensure_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class MessageCreate(BaseModel):
    message_text: str = Field(..., min_length=1, max_length=1000)
    message_type: str = Field(default="LOVING_NOTE")  # LOVING_NOTE, MED_NUDGE, TASK_ALERT, VOICE_NOTE
    is_urgent: bool = False


class QuickNudgeCreate(BaseModel):
    nudge_type: str = Field(default="MEDICINE")  # MEDICINE, WALK, WATER, VITALS, CUSTOM
    custom_message: Optional[str] = None


class MessageOut(BaseModel):
    id: int
    sender_name: str
    sender_role: str
    message_text: str
    message_type: str
    is_urgent: bool
    is_read_by_elder: bool
    read_at: Optional[datetime]
    reactions: str
    created_at: datetime


class MedicineDoseStatus(BaseModel):
    dose_id: int
    medication_name: str
    dosage: str
    form: str
    instructions: Optional[str]
    scheduled_time: str
    status: str  # PENDING, TAKEN, MISSED, SKIPPED
    acted_at: Optional[datetime]
    acted_by: Optional[str]
    is_snoozed: bool = False
    snoozed_until_str: Optional[str] = None
    snooze_count: int = 0


class TaskItemStatus(BaseModel):
    log_id: int
    title: str
    category: str
    scheduled_time: str
    status: str
    completed_at: Optional[datetime]
    completed_by_name: Optional[str]


class ElderLiveStatusOut(BaseModel):
    elder_name: str
    elder_age: Optional[int]
    profile_code: str
    current_time_local: str
    today_date: str
    overall_status: str  # ON_TRACK, UPCOMING_DUE, ATTENTION_NEEDED
    status_headline: str
    status_subtext: str
    # Medication metrics
    total_doses_today: int
    taken_doses_today: int
    pending_doses_today: int
    missed_doses_today: int
    adherence_pct_today: int
    next_dose: Optional[MedicineDoseStatus]
    today_doses: List[MedicineDoseStatus]
    # Care tasks metrics
    total_tasks_today: int
    completed_tasks_today: int
    pending_tasks_today: int
    today_tasks: List[TaskItemStatus]
    # Latest vitals
    latest_bp: Optional[str] = None
    latest_sugar: Optional[str] = None
    latest_heart_rate: Optional[str] = None
    latest_spo2: Optional[str] = None
    # Family Community activity
    unread_family_messages: int = 0


@router.get("/messages", response_model=List[MessageOut])
def get_family_messages(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve the recent family community messages and alert feed."""
    msgs = (
        db.query(FamilyMessage)
        .filter(FamilyMessage.profile_id == profile.id)
        .order_by(FamilyMessage.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        MessageOut(
            id=m.id,
            sender_name=m.sender_name,
            sender_role=m.sender_role,
            message_text=m.message_text,
            message_type=m.message_type or "LOVING_NOTE",
            is_urgent=m.is_urgent,
            is_read_by_elder=m.is_read_by_elder,
            read_at=m.read_at,
            reactions=m.reactions or "❤️",
            created_at=ensure_utc(m.created_at),
        )
        for m in msgs
    ]


@router.post("/messages", status_code=status.HTTP_201_CREATED)
def post_family_message(
    payload: MessageCreate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Post a loving family message or instant alert to the community feed."""
    msg = FamilyMessage(
        profile_id=profile.id,
        sender_member_id=member.id,
        sender_name=member.name,
        sender_role=member.role,
        message_text=payload.message_text.strip(),
        message_type=payload.message_type,
        is_urgent=payload.is_urgent,
        is_read_by_elder=False,
    )
    db.add(msg)
    db.flush()

    # If sender is elder, mark as read by elder
    if member.role == "ELDER":
        msg.is_read_by_elder = True
        msg.read_at = datetime.now(timezone.utc)

    # If urgent or nudge, also notify elder via email
    if payload.is_urgent and member.role != "ELDER":
        elder = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "ELDER").first()
        if elder and elder.email:
            send_email(
                elder.email,
                f"❤️ Message from {member.name} for {profile.elder_name}",
                f"<p style='font-size:18px;'><strong>{member.name}</strong> says:</p><blockquote style='font-size:20px; color:#0B1F3A;'>{payload.message_text}</blockquote>",
                f"{member.name} says: {payload.message_text}",
            )

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="FAMILY_MESSAGE_POSTED",
        details={"type": payload.message_type, "is_urgent": payload.is_urgent},
    ))
    db.commit()
    db.refresh(msg)

    return {
        "status": "success",
        "message_id": msg.id,
        "message": "Message posted to family circle! ❤️",
    }


@router.post("/messages/{message_id}/react")
def react_to_message(
    message_id: int,
    reaction: Optional[str] = "❤️",
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Elder or family member reacts with love/acknowledgment to a message."""
    msg = db.query(FamilyMessage).filter(
        FamilyMessage.id == message_id,
        FamilyMessage.profile_id == profile.id,
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.reactions = reaction or "❤️"
    if member.role == "ELDER":
        msg.is_read_by_elder = True
        msg.read_at = datetime.now(timezone.utc)

    db.commit()
    return {"status": "success", "reaction": msg.reactions, "is_read_by_elder": msg.is_read_by_elder}


@router.post("/quick-nudge")
def send_quick_nudge(
    payload: QuickNudgeCreate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """1-Click Nudge sent from family dashboard to Dada ji."""
    nudge_templates = {
        "MEDICINE": f"Dada ji, please don't forget your scheduled medicine! Sending love ❤️ - {member.name}",
        "WALK": f"Dada ji, time for your gentle evening stroll! Take your walking stick and water bottle. - {member.name}",
        "WATER": f"Dada ji, gentle reminder to drink a fresh glass of water! Stay hydrated. 💧 - {member.name}",
        "VITALS": f"Dada ji, please check your blood pressure/sugar when you are comfortable today! - {member.name}",
        "CUSTOM": payload.custom_message or f"Dada ji, thinking of you! Hope you're feeling great today. ❤️ - {member.name}",
    }

    text = payload.custom_message if payload.nudge_type == "CUSTOM" and payload.custom_message else nudge_templates.get(payload.nudge_type, nudge_templates["MEDICINE"])

    msg = FamilyMessage(
        profile_id=profile.id,
        sender_member_id=member.id,
        sender_name=member.name,
        sender_role=member.role,
        message_text=text,
        message_type="MED_NUDGE" if payload.nudge_type == "MEDICINE" else "TASK_ALERT",
        is_urgent=True,
        is_read_by_elder=False,
    )
    db.add(msg)

    elder = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "ELDER").first()
    if elder and elder.email:
        send_email(
            elder.email,
            f"🔔 Caring Alert from {member.name}",
            f"<p style='font-size:18px;'><strong>{text}</strong></p>",
            text,
        )

    db.commit()
    return {"status": "success", "message": f"Alert sent to {profile.elder_name}!", "text": text}


@router.get("/elder-live-status", response_model=ElderLiveStatusOut)
def get_elder_live_status(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """
    Dedicated Family & Caretaker Live Watch:
    Real-time status of whether Dada ji took medicines today, task completion,
    vitals summary, and reassuring progress badge.
    """
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_local = datetime.now(user_tz)
    today_date = now_local.date()
    start_of_day_utc = datetime(today_date.year, today_date.month, today_date.day, 0, 0, 0, tzinfo=user_tz).astimezone(timezone.utc)
    end_of_day_utc = datetime(today_date.year, today_date.month, today_date.day, 23, 59, 59, tzinfo=user_tz).astimezone(timezone.utc)

    # 1. Today's Dose Logs
    doses = (
        db.query(DoseLog)
        .join(Medication)
        .filter(
            DoseLog.profile_id == profile.id,
            DoseLog.scheduled_at >= start_of_day_utc,
            DoseLog.scheduled_at <= end_of_day_utc,
        )
        .order_by(DoseLog.scheduled_at.asc())
        .all()
    )

    dose_statuses: List[MedicineDoseStatus] = []
    taken_count = 0
    pending_count = 0
    missed_count = 0
    next_dose_item: Optional[MedicineDoseStatus] = None

    for d in doses:
        sch_utc = ensure_utc(d.scheduled_at)
        sch_local = sch_utc.astimezone(user_tz)
        sch_str = sch_local.strftime("%I:%M %p")

        snooze_utc = ensure_utc(d.snoozed_until)
        now_utc = datetime.now(timezone.utc)
        is_snoozed = bool(snooze_utc and snooze_utc > now_utc)
        snooze_str = snooze_utc.astimezone(user_tz).strftime("%I:%M %p") if snooze_utc else None

        item = MedicineDoseStatus(
            dose_id=d.id,
            medication_name=d.medication.name if d.medication else "Medicine",
            dosage=d.medication.dosage if d.medication else "",
            form=d.medication.form if d.medication else "tablet",
            instructions=d.medication.instructions if d.medication else None,
            scheduled_time=sch_str,
            status=d.status,
            acted_at=ensure_utc(d.acted_at),
            acted_by=d.actor.name if d.actor else None,
            is_snoozed=is_snoozed,
            snoozed_until_str=snooze_str,
            snooze_count=d.snooze_count or 0,
        )
        dose_statuses.append(item)

        if d.status == "TAKEN":
            taken_count += 1
        elif d.status == "PENDING":
            pending_count += 1
            if next_dose_item is None:
                next_dose_item = item
        elif d.status == "MISSED":
            # If snoozed, do not count as missed!
            if is_snoozed:
                pending_count += 1
            else:
                missed_count += 1

    total_doses = len(dose_statuses)
    adherence_pct = int((taken_count / total_doses * 100)) if total_doses > 0 else 100

    # 2. Today's Care Tasks
    task_logs = (
        db.query(CareTaskLog)
        .join(CareTask)
        .filter(
            CareTaskLog.profile_id == profile.id,
            CareTaskLog.scheduled_date == today_date,
            CareTask.is_active.is_(True),
        )
        .all()
    )

    task_items: List[TaskItemStatus] = []
    completed_tasks = 0
    for tl in task_logs:
        task_items.append(
            TaskItemStatus(
                log_id=tl.id,
                title=tl.task.title if tl.task else "Task",
                category=tl.task.category if tl.task else "ROUTINE",
                scheduled_time=tl.task.scheduled_time if tl.task else "08:00",
                status=tl.status,
                completed_at=ensure_utc(tl.completed_at),
                completed_by_name=tl.completed_by_name,
            )
        )
        if tl.status == "COMPLETED":
            completed_tasks += 1

    total_tasks = len(task_items)
    pending_tasks = total_tasks - completed_tasks

    # 3. Latest Vitals
    latest_bp_vital = (
        db.query(HealthVital)
        .filter(HealthVital.profile_id == profile.id, HealthVital.vital_type == "BLOOD_PRESSURE")
        .order_by(HealthVital.recorded_at.desc())
        .first()
    )
    latest_sugar_vital = (
        db.query(HealthVital)
        .filter(HealthVital.profile_id == profile.id, HealthVital.vital_type.in_(["BLOOD_GLUCOSE", "BLOOD_SUGAR"]))
        .order_by(HealthVital.recorded_at.desc())
        .first()
    )
    latest_hr_vital = (
        db.query(HealthVital)
        .filter(HealthVital.profile_id == profile.id, HealthVital.vital_type == "HEART_RATE")
        .order_by(HealthVital.recorded_at.desc())
        .first()
    )
    latest_spo2_vital = (
        db.query(HealthVital)
        .filter(HealthVital.profile_id == profile.id, HealthVital.vital_type == "OXYGEN_SPO2")
        .order_by(HealthVital.recorded_at.desc())
        .first()
    )

    bp_str = f"{int(latest_bp_vital.value_numeric)}/{int(latest_bp_vital.value_secondary)} mmHg" if (latest_bp_vital and latest_bp_vital.value_secondary) else None
    sugar_str = f"{int(latest_sugar_vital.value_numeric)} mg/dL" if latest_sugar_vital else None
    hr_str = f"{int(latest_hr_vital.value_numeric)} bpm" if latest_hr_vital else None
    spo2_str = f"{int(latest_spo2_vital.value_numeric)}%" if latest_spo2_vital else None

    # 4. Determine Reassuring Status
    snoozed_items = [ds for ds in dose_statuses if ds.is_snoozed]

    if snoozed_items and missed_count == 0:
        first_snoozed = snoozed_items[0]
        overall = "ON_TRACK"
        headline = f"{profile.elder_name} will take it at {first_snoozed.snoozed_until_str}"
        subtext = f"{first_snoozed.medication_name} is snoozed. Escalation alerts paused."
    elif missed_count > 0:
        overall = "ATTENTION_NEEDED"
        headline = f"⚠️ Missed {missed_count} Dose Today"
        subtext = f"{profile.elder_name} has an unacknowledged dose. Escalation alert has notified caretakers."
    elif pending_count == 0 and total_doses > 0:
        overall = "ON_TRACK"
        headline = f"✓ All {taken_count} Medicines Taken!"
        subtext = f"{profile.elder_name} has taken every scheduled dose for today. Completely up-to-date."
    elif next_dose_item:
        overall = "UPCOMING_DUE"
        headline = f"Next Dose at {next_dose_item.scheduled_time}"
        subtext = f"{next_dose_item.medication_name} ({next_dose_item.dosage}) is scheduled next. {taken_count}/{total_doses} doses taken so far."
    else:
        overall = "ON_TRACK"
        headline = "All clear for today"
        subtext = "No pending medications at this moment."

    # Unread family notes for elder
    unread_count = (
        db.query(FamilyMessage)
        .filter(
            FamilyMessage.profile_id == profile.id,
            FamilyMessage.is_read_by_elder.is_(False),
        )
        .count()
    )

    return ElderLiveStatusOut(
        elder_name=profile.elder_name,
        elder_age=profile.elder_age,
        profile_code=profile.code,
        current_time_local=now_local.strftime("%I:%M %p"),
        today_date=now_local.strftime("%A, %B %d"),
        overall_status=overall,
        status_headline=headline,
        status_subtext=subtext,
        total_doses_today=total_doses,
        taken_doses_today=taken_count,
        pending_doses_today=pending_count,
        missed_doses_today=missed_count,
        adherence_pct_today=adherence_pct,
        next_dose=next_dose_item,
        today_doses=dose_statuses,
        total_tasks_today=total_tasks,
        completed_tasks_today=completed_tasks,
        pending_tasks_today=pending_tasks,
        today_tasks=task_items,
        latest_bp=bp_str,
        latest_sugar=sugar_str,
        latest_heart_rate=hr_str,
        latest_spo2=spo2_str,
        unread_family_messages=unread_count,
    )
