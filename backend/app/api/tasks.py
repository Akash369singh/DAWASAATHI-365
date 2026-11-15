from datetime import datetime, date, timedelta, timezone
import zoneinfo
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, CareTask, CareTaskLog, AuditLog
from app.core.deps import get_current_member, get_current_profile
from app.services.email_service import send_email

router = APIRouter(prefix="/api/tasks", tags=["Care Tasks & 1-Month Planner"])


def ensure_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    category: str = Field(default="HEALTH_CHECK")  # EXERCISE, HEALTH_CHECK, NUTRITION, HYDRATION, ROUTINE, CUSTOM
    scheduled_time: str = Field(default="08:00")  # HH:MM
    duration_days: int = Field(default=30, ge=1, le=365)  # Default 1-Month Plan!
    days_of_week: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])
    persistent_alert: bool = True


class TaskLogOut(BaseModel):
    id: int
    task_id: int
    title: str
    description: Optional[str]
    category: str
    scheduled_time: str
    scheduled_date: str
    status: str  # PENDING, COMPLETED, SKIPPED
    completed_at: Optional[datetime]
    completed_by_name: Optional[str]
    persistent_alert: bool
    nudge_count: int
    created_by_name: str


class TodayTasksSummary(BaseModel):
    today_date: str
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    tasks: List[TaskLogOut] = []


def ensure_today_task_logs(profile: Profile, db: Session, user_tz: zoneinfo.ZoneInfo):
    """Ensure care task log records exist for today."""
    now_local = datetime.now(user_tz)
    today = now_local.date()
    weekday = today.weekday()

    active_tasks = db.query(CareTask).filter(
        CareTask.profile_id == profile.id,
        CareTask.is_active.is_(True),
    ).all()

    for task in active_tasks:
        if task.start_date and today < task.start_date:
            continue
        if task.end_date and today > task.end_date:
            continue
        if task.days_of_week and weekday not in task.days_of_week:
            continue

        existing_log = db.query(CareTaskLog).filter(
            CareTaskLog.task_id == task.id,
            CareTaskLog.scheduled_date == today,
        ).first()

        if not existing_log:
            new_log = CareTaskLog(
                task_id=task.id,
                profile_id=profile.id,
                scheduled_date=today,
                status="PENDING",
                nudge_count=0,
            )
            db.add(new_log)
    db.commit()


@router.get("/today", response_model=TodayTasksSummary)
def get_today_care_tasks(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve today's daily care tasks with persistent alert statuses."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    ensure_today_task_logs(profile, db, user_tz)

    now_local = datetime.now(user_tz)
    today = now_local.date()

    logs = (
        db.query(CareTaskLog)
        .join(CareTask)
        .filter(
            CareTaskLog.profile_id == profile.id,
            CareTaskLog.scheduled_date == today,
            CareTask.is_active.is_(True),
        )
        .all()
    )

    formatted = []
    for l in logs:
        task = l.task
        formatted.append(
            TaskLogOut(
                id=l.id,
                task_id=task.id,
                title=task.title,
                description=task.description,
                category=task.category,
                scheduled_time=task.scheduled_time,
                scheduled_date=l.scheduled_date.isoformat(),
                status=l.status,
                completed_at=l.completed_at,
                completed_by_name=l.completed_by_name,
                persistent_alert=task.persistent_alert,
                nudge_count=l.nudge_count,
                created_by_name=task.created_by_name,
            )
        )

    # Sort by scheduled time
    formatted.sort(key=lambda x: x.scheduled_time)

    total = len(formatted)
    completed = sum(1 for t in formatted if t.status == "COMPLETED")
    pending = total - completed

    return TodayTasksSummary(
        today_date=today.strftime("%A, %B %d"),
        total_tasks=total,
        completed_tasks=completed,
        pending_tasks=pending,
        tasks=formatted,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_care_task(
    payload: TaskCreate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Create a new daily care task or full 1-month routine plan."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_local = datetime.now(user_tz)
    start_d = now_local.date()
    end_d = start_d + timedelta(days=payload.duration_days)

    task = CareTask(
        profile_id=profile.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        scheduled_time=payload.scheduled_time,
        start_date=start_d,
        end_date=end_d,
        days_of_week=payload.days_of_week,
        frequency="DAILY",
        persistent_alert=payload.persistent_alert,
        created_by_member_id=member.id,
        created_by_name=member.name,
        is_active=True,
    )
    db.add(task)
    db.flush()

    # Generate log for today if applicable
    if start_d.weekday() in payload.days_of_week:
        db.add(CareTaskLog(
            task_id=task.id,
            profile_id=profile.id,
            scheduled_date=start_d,
            status="PENDING",
            nudge_count=0,
        ))

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="CARE_TASK_CREATED",
        details={"title": task.title, "duration_days": payload.duration_days, "time": task.scheduled_time},
    ))
    db.commit()
    db.refresh(task)

    return {
        "status": "success",
        "message": f"Care task '{task.title}' planned for next {payload.duration_days} days!",
        "task_id": task.id,
        "title": task.title,
        "duration_days": payload.duration_days,
        "scheduled_time": task.scheduled_time,
    }


@router.post("/{log_id}/complete")
def complete_care_task(
    log_id: int,
    notes: Optional[str] = None,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Mark a daily care task as completed."""
    log = db.query(CareTaskLog).filter(
        CareTaskLog.id == log_id,
        CareTaskLog.profile_id == profile.id,
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Task record not found")

    log.status = "COMPLETED"
    log.completed_at = datetime.now(timezone.utc)
    log.completed_by_member_id = member.id
    log.completed_by_name = member.name
    if notes:
        log.notes = notes

    task_name = log.task.title if log.task else "Task"

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="CARE_TASK_COMPLETED",
        details={"task": task_name, "completed_by": member.name},
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"'{task_name}' marked as completed! ✓",
        "task_id": log.id,
        "new_status": "COMPLETED",
    }


@router.post("/{log_id}/nudge")
def nudge_care_task(
    log_id: int,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Family member sends a caring nudge to Dada ji for an incomplete task."""
    log = db.query(CareTaskLog).filter(
        CareTaskLog.id == log_id,
        CareTaskLog.profile_id == profile.id,
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Task record not found")

    log.nudge_count += 1
    log.last_nudged_at = datetime.now(timezone.utc)

    task_name = log.task.title if log.task else "Task"

    # Send email notification to elder if available
    elder = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "ELDER").first()
    if elder and elder.email:
        subject = f"❤️ Gentle Reminder from {member.name}: {task_name}"
        body = f"Hello {profile.elder_name},\n\n{member.name} noticed that your task '{task_name}' is scheduled for today. Please take a moment to complete it when comfortable!\n\nDawaSaathi 365 Family Team"
        send_email(elder.email, subject, f"<p>{body}</p>", body)

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="CARE_TASK_NUDGED",
        details={"task": task_name, "nudged_by": member.name, "count": log.nudge_count},
    ))
    db.commit()

    return {
        "status": "nudged",
        "message": f"Sent loving reminder to {profile.elder_name} for '{task_name}'.",
        "nudge_count": log.nudge_count,
    }


@router.delete("/{task_id}")
def delete_care_task(
    task_id: int,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Deactivate care task."""
    task = db.query(CareTask).filter(
        CareTask.id == task_id,
        CareTask.profile_id == profile.id,
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_active = False
    db.commit()
    return {"status": "success", "message": f"Task '{task.title}' removed from active routine."}
