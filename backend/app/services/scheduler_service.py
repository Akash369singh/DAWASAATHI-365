import logging
import zoneinfo
from datetime import datetime, date, time, timedelta, timezone
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

logger = logging.getLogger(__name__)

from app.database import SessionLocal
from app.config import settings
from app.models import (
    Profile,
    Member,
    Medication,
    DoseLog,
    Appointment,
    NotificationLog,
    ActionToken,
    CareTask,
    CareTaskLog,
    SOSEvent,
    AuditLog,
    CheckIn,
)
from app.core.security import generate_action_token
from app.services.email_service import (
    send_email,
    build_upcoming_dose_email,
    build_escalation_alert_email,
    build_appointment_reminder_email,
    build_refill_alert_email,
    build_weekly_digest_email,
)

scheduler = BackgroundScheduler()


def ensure_utc(dt):
    """Normalize SQLite naive datetime or aware datetime to UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def generate_missing_dose_logs(db: Session, target_days_ahead: int = 1):
    """Ensure scheduled doses exist in dose_logs table for active medications."""
    profiles = db.query(Profile).all()
    for profile in profiles:
        try:
            local_tz = zoneinfo.ZoneInfo(profile.timezone or settings.TIMEZONE)
        except Exception:
            local_tz = zoneinfo.ZoneInfo(settings.TIMEZONE)

        now_local = datetime.now(local_tz)
        
        # Check today and target_days_ahead
        for d in range(target_days_ahead + 1):
            check_date = (now_local + timedelta(days=d)).date()
            weekday = check_date.weekday()

            active_meds = db.query(Medication).filter(
                Medication.profile_id == profile.id,
                Medication.is_active.is_(True),
            ).all()

            for med in active_meds:
                if med.start_date and check_date < med.start_date:
                    continue
                if med.end_date and check_date > med.end_date:
                    continue
                if med.days_of_week and weekday not in med.days_of_week:
                    continue

                for time_str in med.schedule_times:
                    try:
                        hour, minute = map(int, time_str.split(":"))
                        dose_local = datetime.combine(check_date, time(hour, minute), tzinfo=local_tz)
                        dose_utc = dose_local.astimezone(timezone.utc)

                        # Check if already generated
                        existing = db.query(DoseLog).filter(
                            DoseLog.profile_id == profile.id,
                            DoseLog.medication_id == med.id,
                            DoseLog.scheduled_at == dose_utc,
                        ).first()

                        if not existing:
                            new_dose = DoseLog(
                                profile_id=profile.id,
                                medication_id=med.id,
                                scheduled_at=dose_utc,
                                status="PENDING",
                                escalation_level=0,
                            )
                            db.add(new_dose)
                            db.flush()
                    except Exception as err:
                        logger.warning(f"Error parsing schedule time {time_str} for med {med.id}: {err}")

    db.commit()


def process_reminders_and_escalations():
    """Main scheduler job: checks upcoming doses, grace windows, escalations, and appointments."""
    db = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc)

        # 1. Ensure dose logs are generated
        generate_missing_dose_logs(db, target_days_ahead=1)

        # 2. Check Upcoming Doses (e.g. 10-15 minutes prior)
        upcoming_doses = db.query(DoseLog).join(Profile).filter(
            DoseLog.status == "PENDING",
        ).all()

        for dose in upcoming_doses:
            sched_utc = ensure_utc(dose.scheduled_at)
            mins_until = (sched_utc - now_utc).total_seconds() / 60.0
            # Only trigger if between 0 and 15 minutes ahead
            if not (0 <= mins_until <= 15):
                continue

            profile = dose.profile
            elder = db.query(Member).filter(
                Member.profile_id == profile.id,
                Member.role == "ELDER",
                Member.is_active.is_(True),
            ).first()

            if not elder or not elder.email:
                continue

            notif_type = "DOSE_UPCOMING"
            # Check deduplication in database
            already_sent = db.query(NotificationLog).filter(
                NotificationLog.notification_type == notif_type,
                NotificationLog.ref_id == dose.id,
                NotificationLog.recipient_email == elder.email,
            ).first()

            if not already_sent:
                token_str = generate_action_token(dose.id, "TAKE_DOSE", elder.id)
                action_token = ActionToken(
                    token_hash=token_str,
                    action_type="TAKE_DOSE",
                    ref_id=dose.id,
                    profile_id=profile.id,
                    member_id=elder.id,
                    expires_at=now_utc + timedelta(days=2),
                )
                db.add(action_token)

                # Also generate single-use snooze link (30 min)
                snooze_token_str = generate_action_token(
                    dose_log_id=dose.id,
                    action="SNOOZE_DOSE",
                    member_id=elder.id,
                    extra={"minutes": 30},
                )
                action_token_snooze = ActionToken(
                    token_hash=snooze_token_str,
                    action_type="SNOOZE_DOSE",
                    ref_id=dose.id,
                    profile_id=profile.id,
                    member_id=elder.id,
                    expires_at=now_utc + timedelta(days=2),
                )
                db.add(action_token_snooze)

                magic_url = f"{settings.FRONTEND_URL}/action?token={token_str}"
                magic_snooze_url = f"{settings.FRONTEND_URL}/action?token={snooze_token_str}"
                
                try:
                    local_tz = zoneinfo.ZoneInfo(profile.timezone or settings.TIMEZONE)
                    time_local = dose.scheduled_at.astimezone(local_tz).strftime("%I:%M %p")
                except Exception:
                    time_local = dose.scheduled_at.strftime("%H:%M UTC")

                subject, html_body, text_body = build_upcoming_dose_email(
                    elder_name=profile.elder_name,
                    med_name=dose.medication.name,
                    dosage=dose.medication.dosage,
                    instructions=dose.medication.instructions,
                    scheduled_time_str=time_local,
                    magic_take_url=magic_url,
                    magic_snooze_url=magic_snooze_url,
                )

                sent = send_email(elder.email, subject, html_body, text_body)
                if sent:
                    notif_log = NotificationLog(
                        profile_id=profile.id,
                        notification_type=notif_type,
                        ref_id=dose.id,
                        recipient_email=elder.email,
                        recipient_role=elder.role,
                        subject=subject,
                        message_body=text_body,
                        status="SENT",
                    )
                    db.add(notif_log)
                    db.commit()

        # 3. Check Overdue Doses (Grace window auto-mark MISSED)
        all_pending = db.query(DoseLog).join(Profile).filter(
            DoseLog.status == "PENDING",
        ).all()

        for dose in all_pending:
            profile = dose.profile
            # If snoozed and snooze time not reached yet, do NOT mark MISSED
            if dose.snoozed_until:
                snooze_utc = ensure_utc(dose.snoozed_until)
                if now_utc < snooze_utc:
                    continue

            grace_mins = profile.grace_window_minutes or 45
            sched_utc = ensure_utc(dose.scheduled_at)
            if sched_utc > now_utc:
                continue

            overdue_delta = (now_utc - sched_utc).total_seconds() / 60.0

            # If overdue past grace window, mark MISSED
            if overdue_delta >= grace_mins:
                dose.status = "MISSED"
                db.commit()

        # 4. Check Escalation Ladder
        # Level 1: Escalation to Caretaker
        all_due_for_caretaker = db.query(DoseLog).join(Profile).filter(
            DoseLog.status.in_(["PENDING", "MISSED"]),
            DoseLog.escalation_level < 1,
        ).all()

        for dose in all_due_for_caretaker:
            profile = dose.profile
            # If snoozed and snooze time not reached yet, PAUSE escalation
            if dose.snoozed_until:
                snooze_utc = ensure_utc(dose.snoozed_until)
                if now_utc < snooze_utc:
                    continue

            esc_mins_1 = profile.escalation_level_1_mins or 15
            sched_utc = ensure_utc(dose.scheduled_at)
            if sched_utc > now_utc:
                continue

            elapsed_mins = (now_utc - sched_utc).total_seconds() / 60.0

            if elapsed_mins >= esc_mins_1:
                caretakers = db.query(Member).filter(
                    Member.profile_id == profile.id,
                    Member.role == "CARETAKER",
                    Member.is_active.is_(True),
                ).all()

                try:
                    local_tz = zoneinfo.ZoneInfo(profile.timezone or settings.TIMEZONE)
                    time_local = sched_utc.astimezone(local_tz).strftime("%I:%M %p")
                except Exception:
                    time_local = sched_utc.strftime("%H:%M UTC")

                for caretaker in caretakers:
                    if not caretaker.email:
                        continue
                    notif_type = "ESCALATION_CARETAKER"
                    exists = db.query(NotificationLog).filter(
                        NotificationLog.notification_type == notif_type,
                        NotificationLog.ref_id == dose.id,
                        NotificationLog.recipient_email == caretaker.email,
                    ).first()

                    if not exists:
                        token_str = generate_action_token(dose.id, "TAKE_DOSE", caretaker.id)
                        magic_url = f"{settings.FRONTEND_URL}/action?token={token_str}"
                        subject, html_body, text_body = build_escalation_alert_email(
                            elder_name=profile.elder_name,
                            recipient_name=caretaker.name,
                            med_name=dose.medication.name,
                            dosage=dose.medication.dosage,
                            scheduled_time_str=time_local,
                            escalation_role="Caretaker",
                            magic_take_url=magic_url,
                        )
                        if send_email(caretaker.email, subject, html_body, text_body):
                            db.add(NotificationLog(
                                profile_id=profile.id,
                                notification_type=notif_type,
                                ref_id=dose.id,
                                recipient_email=caretaker.email,
                                recipient_role="CARETAKER",
                                subject=subject,
                                message_body=text_body,
                            ))

                dose.escalation_level = 1
                db.commit()

        # Level 2: Escalation to Family Members
        all_due_for_family = db.query(DoseLog).join(Profile).filter(
            DoseLog.status.in_(["PENDING", "MISSED"]),
            DoseLog.escalation_level == 1,
        ).all()

        for dose in all_due_for_family:
            profile = dose.profile
            # If snoozed and snooze time not reached yet, PAUSE escalation
            if dose.snoozed_until:
                snooze_utc = ensure_utc(dose.snoozed_until)
                if now_utc < snooze_utc:
                    continue

            esc_mins_1 = profile.escalation_level_1_mins or 15
            esc_mins_2 = profile.escalation_level_2_mins or 30
            total_threshold = esc_mins_1 + esc_mins_2
            sched_utc = ensure_utc(dose.scheduled_at)
            if sched_utc > now_utc:
                continue

            elapsed_mins = (now_utc - sched_utc).total_seconds() / 60.0

            if elapsed_mins >= total_threshold:
                family_members = db.query(Member).filter(
                    Member.profile_id == profile.id,
                    Member.role == "FAMILY",
                    Member.is_active.is_(True),
                ).all()

                try:
                    local_tz = zoneinfo.ZoneInfo(profile.timezone or settings.TIMEZONE)
                    time_local = sched_utc.astimezone(local_tz).strftime("%I:%M %p")
                except Exception:
                    time_local = sched_utc.strftime("%H:%M UTC")

                for fam in family_members:
                    if not fam.email:
                        continue
                    # Check elder-controlled permission to receive alerts
                    perms = fam.permissions or {}
                    if not perms.get("receive_missed_alerts", True):
                        continue

                    notif_type = "ESCALATION_FAMILY"
                    exists = db.query(NotificationLog).filter(
                        NotificationLog.notification_type == notif_type,
                        NotificationLog.ref_id == dose.id,
                        NotificationLog.recipient_email == fam.email,
                    ).first()

                    if not exists:
                        token_str = generate_action_token(dose.id, "TAKE_DOSE", fam.id)
                        magic_url = f"{settings.FRONTEND_URL}/action?token={token_str}"
                        subject, html_body, text_body = build_escalation_alert_email(
                            elder_name=profile.elder_name,
                            recipient_name=fam.name,
                            med_name=dose.medication.name,
                            dosage=dose.medication.dosage,
                            scheduled_time_str=time_local,
                            escalation_role="Family Member",
                            magic_take_url=magic_url,
                        )
                        if send_email(fam.email, subject, html_body, text_body):
                            db.add(NotificationLog(
                                profile_id=profile.id,
                                notification_type=notif_type,
                                ref_id=dose.id,
                                recipient_email=fam.email,
                                recipient_role="FAMILY",
                                subject=subject,
                                message_body=text_body,
                            ))

                dose.escalation_level = 2
                db.commit()

        # 4b. Check Snoozed Doses whose snooze time has elapsed (Single reminder only)
        all_snoozed = db.query(DoseLog).join(Profile).filter(
            DoseLog.status == "PENDING",
            DoseLog.snoozed_until.isnot(None),
        ).all()

        for dose in all_snoozed:
            snooze_utc = ensure_utc(dose.snoozed_until)
            if now_utc >= snooze_utc:
                notif_type = f"DOSE_SNOOZE_REMINDER_{dose.snooze_count}"
                elder = db.query(Member).filter(
                    Member.profile_id == dose.profile_id,
                    Member.role == "ELDER",
                    Member.is_active.is_(True),
                ).first()
                if not elder or not elder.email:
                    continue

                already_sent = db.query(NotificationLog).filter(
                    NotificationLog.notification_type == notif_type,
                    NotificationLog.ref_id == dose.id,
                    NotificationLog.recipient_email == elder.email,
                ).first()

                if not already_sent:
                    token_str = generate_action_token(dose_log_id=dose.id, action="TAKE_DOSE", member_id=elder.id)
                    action_token = ActionToken(
                        token_hash=token_str,
                        action_type="TAKE_DOSE",
                        ref_id=dose.id,
                        profile_id=dose.profile_id,
                        member_id=elder.id,
                        expires_at=now_utc + timedelta(days=2),
                    )
                    db.add(action_token)
                    magic_url = f"{settings.FRONTEND_URL}/action?token={token_str}"

                    try:
                        local_tz = zoneinfo.ZoneInfo(dose.profile.timezone or settings.TIMEZONE)
                        snooze_time_str = snooze_utc.astimezone(local_tz).strftime("%I:%M %p")
                    except Exception:
                        snooze_time_str = snooze_utc.strftime("%H:%M UTC")

                    subject = f"⏰ Snooze Reminder: {dose.profile.elder_name}, time for {dose.medication.name}"
                    body_txt = (
                        f"Hello {dose.profile.elder_name},\n\n"
                        f"Your snoozed reminder for {dose.medication.name} ({dose.medication.dosage}) is due now ({snooze_time_str}).\n\n"
                        f"Click below to mark as taken:\n👉 {magic_url}\n\n"
                        f"DawaSaathi 365 Closed-Loop Health Companion"
                    )
                    body_html = f"""
                    <!DOCTYPE html>
                    <html>
                    <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F9FB;">
                      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #E6EBF1; box-shadow: 0 4px 12px rgba(11,31,58,0.05);">
                        <div style="display: flex; align-items: center; margin-bottom: 20px;">
                          <span style="font-size: 24px; font-weight: bold; color: #0B1F3A;">DawaSaathi 365</span>
                          <span style="margin-left: 8px; font-size: 13px; color: #D97706; background: #FEF3C7; padding: 4px 10px; border-radius: 999px; font-weight: 600;">Snoozed Dose Due</span>
                        </div>
                        <h2 style="color: #0B1F3A; font-size: 22px; margin-top: 0;">Time for your medicine, {dose.profile.elder_name}</h2>
                        <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 16px 20px; border-radius: 12px; margin: 20px 0;">
                          <div style="font-size: 20px; font-weight: 700; color: #0B1F3A;">{dose.medication.name} <span style="font-size: 16px; font-weight: 500; color: #4B5563;">({dose.medication.dosage})</span></div>
                          <div style="font-size: 15px; color: #B45309; font-weight: 600; margin-top: 4px;">🕒 Snooze period ended at {snooze_time_str}</div>
                        </div>
                        <div style="text-align: center; margin: 28px 0 20px 0;">
                          <a href="{magic_url}" style="display: inline-block; background-color: #14B8A6; color: #ffffff; text-decoration: none; padding: 16px 36px; font-size: 18px; font-weight: 700; border-radius: 14px; box-shadow: 0 4px 14px rgba(20,184,166,0.35);">
                            I took it ✓
                          </a>
                        </div>
                      </div>
                    </body>
                    </html>
                    """
                    if send_email(elder.email, subject, body_html, body_txt):
                        db.add(NotificationLog(
                            profile_id=dose.profile_id,
                            notification_type=notif_type,
                            ref_id=dose.id,
                            recipient_email=elder.email,
                            recipient_role=elder.role,
                            subject=subject,
                            message_body=body_txt,
                            status="SENT",
                        ))
                        db.commit()

        # 5. Check Upcoming Appointments (24h and 2h reminders)
        upcoming_apts = db.query(Appointment).join(Profile).filter(
            Appointment.status == "SCHEDULED",
        ).all()

        for apt in upcoming_apts:
            profile = apt.profile
            apt_utc = ensure_utc(apt.scheduled_datetime)
            if apt_utc <= now_utc:
                continue

            hours_ahead = (apt_utc - now_utc).total_seconds() / 3600.0

            # Target recipients: Elder & Caretakers
            recipients = db.query(Member).filter(
                Member.profile_id == profile.id,
                Member.role.in_(["ELDER", "CARETAKER"]),
                Member.is_active.is_(True),
            ).all()

            try:
                local_tz = zoneinfo.ZoneInfo(profile.timezone or settings.TIMEZONE)
                apt_time_str = apt.scheduled_datetime.astimezone(local_tz).strftime("%A, %b %d at %I:%M %p")
            except Exception:
                apt_time_str = apt.scheduled_datetime.strftime("%Y-%m-%d %H:%M UTC")

            # 24-hour reminder check (between 23h and 25h)
            if 23.0 <= hours_ahead <= 25.0:
                for rec in recipients:
                    notif_type = "APPOINTMENT_24H"
                    exists = db.query(NotificationLog).filter(
                        NotificationLog.notification_type == notif_type,
                        NotificationLog.ref_id == apt.id,
                        NotificationLog.recipient_email == rec.email,
                    ).first()
                    if not exists:
                        subject, html_body, text_body = build_appointment_reminder_email(
                            elder_name=profile.elder_name,
                            recipient_name=rec.name,
                            doctor_name=apt.doctor_name,
                            specialty=apt.specialty,
                            location=apt.location,
                            date_time_str=apt_time_str,
                            hours_prior=24,
                        )
                        if send_email(rec.email, subject, html_body, text_body):
                            db.add(NotificationLog(
                                profile_id=profile.id,
                                notification_type=notif_type,
                                ref_id=apt.id,
                                recipient_email=rec.email,
                                recipient_role=rec.role,
                                subject=subject,
                                message_body=text_body,
                            ))

            # 2-hour reminder check (between 1.5h and 2.5h)
            elif 1.5 <= hours_ahead <= 2.5:
                for rec in recipients:
                    notif_type = "APPOINTMENT_2H"
                    exists = db.query(NotificationLog).filter(
                        NotificationLog.notification_type == notif_type,
                        NotificationLog.ref_id == apt.id,
                        NotificationLog.recipient_email == rec.email,
                    ).first()
                    if not exists:
                        subject, html_body, text_body = build_appointment_reminder_email(
                            elder_name=profile.elder_name,
                            recipient_name=rec.name,
                            doctor_name=apt.doctor_name,
                            specialty=apt.specialty,
                            location=apt.location,
                            date_time_str=apt_time_str,
                            hours_prior=2,
                        )
                        if send_email(rec.email, subject, html_body, text_body):
                            db.add(NotificationLog(
                                profile_id=profile.id,
                                notification_type=notif_type,
                                ref_id=apt.id,
                                recipient_email=rec.email,
                                recipient_role=rec.role,
                                subject=subject,
                                message_body=text_body,
                            ))

        # ------------------------------------------------------------------
        # 4. PERSISTENT CARE TASK ALERTS (Until Completed)
        # ------------------------------------------------------------------
        # For tasks with persistent_alert=True that remain PENDING past their scheduled time today,
        # repeatedly send caring reminder alerts until completed!
        all_active_profiles = db.query(Profile).all()
        for profile in all_active_profiles:
            try:
                local_tz = zoneinfo.ZoneInfo(profile.timezone or settings.TIMEZONE)
            except Exception:
                local_tz = zoneinfo.ZoneInfo(settings.TIMEZONE)

            now_local = datetime.now(local_tz)
            today_date = now_local.date()

            pending_tasks = (
                db.query(CareTaskLog)
                .join(CareTask)
                .filter(
                    CareTaskLog.profile_id == profile.id,
                    CareTaskLog.scheduled_date == today_date,
                    CareTaskLog.status == "PENDING",
                    CareTask.persistent_alert.is_(True),
                    CareTask.is_active.is_(True),
                )
                .all()
            )

            elder_member = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "ELDER").first()

            for task_log in pending_tasks:
                task = task_log.task
                try:
                    hour, minute = map(int, task.scheduled_time.split(":"))
                    task_scheduled_local = datetime.combine(today_date, time(hour, minute), tzinfo=local_tz)
                    task_scheduled_utc = task_scheduled_local.astimezone(timezone.utc)
                except Exception:
                    continue

                # If scheduled time has passed and not nudged in the last 60 minutes
                if now_utc > task_scheduled_utc:
                    mins_overdue = int((now_utc - task_scheduled_utc).total_seconds() / 60)
                    last_nudged = ensure_utc(task_log.last_nudged_at)

                    # Trigger alert if never nudged, or at least 60 minutes since last nudge
                    should_alert = False
                    if last_nudged is None:
                        should_alert = True
                    elif (now_utc - last_nudged).total_seconds() >= 3600:
                        should_alert = True

                    if should_alert and elder_member and elder_member.email:
                        notif_type = "TASK_PERSISTENT_ALERT"
                        subject = f"🔔 Persistent Reminder: {task.title} for {profile.elder_name}"
                        body_text = (
                            f"Hello {profile.elder_name},\n\n"
                            f"This is an ongoing caring reminder for your planned routine: '{task.title}' "
                            f"(scheduled at {task.scheduled_time}).\n"
                            f"This alert will remain active until marked as completed in DawaSaathi 365.\n\n"
                            f"With love and care,\nYour Family Care Circle"
                        )
                        html_body = f"""
                        <div style="font-family:sans-serif; max-width:540px; margin:0 auto; padding:24px; border:2px solid #14B8A6; border-radius:16px;">
                            <h2 style="color:#0B1F3A; margin-top:0;">🔔 Daily Care Routine Reminder</h2>
                            <p style="font-size:16px; color:#334155;">Hello <strong>{profile.elder_name}</strong>,</p>
                            <div style="background:#F0FDFA; padding:16px; border-radius:12px; margin:16px 0;">
                                <p style="font-size:18px; font-weight:bold; color:#0F766E; margin:0;">{task.title}</p>
                                <p style="font-size:14px; color:#0D9488; margin:4px 0 0 0;">Scheduled: {task.scheduled_time} • Category: {task.category}</p>
                                {f'<p style="font-size:13px; color:#475569; margin-top:8px;">{task.description}</p>' if task.description else ''}
                            </div>
                            <p style="font-size:14px; color:#64748B;">This persistent alert keeps reminding until the task is marked as completed on your DawaSaathi 365 dashboard.</p>
                        </div>
                        """
                        if send_email(elder_member.email, subject, html_body, body_text):
                            task_log.nudge_count += 1
                            task_log.last_nudged_at = now_utc
                            db.add(NotificationLog(
                                profile_id=profile.id,
                                notification_type=notif_type,
                                ref_id=task_log.id,
                                recipient_email=elder_member.email,
                                recipient_role="ELDER",
                                subject=subject,
                                message_body=body_text,
                            ))

        # ------------------------------------------------------------------
        # 5. EMERGENCY SOS 5-MINUTE UNACKNOWLEDGED ESCALATION
        # ------------------------------------------------------------------
        open_sos_events = db.query(SOSEvent).filter(
            SOSEvent.status == "OPEN",
            SOSEvent.escalation_sent.is_(False),
        ).all()

        for sos in open_sos_events:
            created_utc = ensure_utc(sos.created_at)
            # 5 minutes without acknowledgment
            if (now_utc - created_utc).total_seconds() >= 300:
                profile = sos.profile
                try:
                    local_tz = zoneinfo.ZoneInfo(profile.timezone or settings.TIMEZONE)
                except Exception:
                    local_tz = zoneinfo.ZoneInfo(settings.TIMEZONE)

                emergency_timestamp = created_utc.astimezone(local_tz).strftime("%I:%M %p on %A, %b %d")
                maps_url = f"https://maps.google.com/?q={sos.latitude},{sos.longitude}" if (sos.latitude and sos.longitude) else None

                # Re-send with higher urgency to ALL emergency contacts
                recipients = db.query(Member).filter(
                    Member.profile_id == sos.profile_id,
                    Member.is_active.is_(True),
                ).all()

                for rec in recipients:
                    if not rec.email:
                        continue

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
                        emergency_timestamp=emergency_timestamp,
                        triggered_by=sos.triggered_by,
                        maps_url=maps_url,
                        magic_ack_url=magic_ack_url,
                        notes=sos.notes,
                        is_escalation=True,
                    )

                    if send_email(rec.email, subject, html_body, text_body):
                        db.add(NotificationLog(
                            profile_id=profile.id,
                            notification_type="SOS_5MIN_ESCALATION",
                            ref_id=sos.id,
                            recipient_email=rec.email,
                            recipient_role=rec.role,
                            subject=subject,
                            message_body=text_body,
                        ))

                sos.escalation_sent = True
                sos.escalated_at = now_utc
                db.add(AuditLog(
                    profile_id=profile.id,
                    actor_name="DawaSaathi 365 Auto-Scheduler",
                    action="EMERGENCY_SOS_5MIN_ESCALATED",
                    details={"sos_id": sos.id, "reason": "Unacknowledged after 5 minutes"},
                ))

        # Feature 5: Check Refill Predictor Alerts
        for profile in all_active_profiles:
            try:
                check_and_send_refill_alerts(db, profile, now_utc)
            except Exception as e:
                logger.warning(f"Refill alert check failed for profile {profile.id}: {e}")

        # Feature 6: Check Sunday 6 PM Family Digest
        for profile in all_active_profiles:
            try:
                user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
                now_loc = now_utc.astimezone(user_tz)
                # Sunday = 6, 18 = 6 PM
                if now_loc.weekday() == 6 and now_loc.hour == 18 and now_loc.minute <= 2:
                    send_weekly_family_digest(db, profile.id, force=False)
            except Exception as e:
                logger.warning(f"Weekly digest trigger failed for profile {profile.id}: {e}")

        db.commit()

    except Exception as exc:
        logger.error(f"Scheduler error: {exc}")
        db.rollback()
    finally:
        db.close()


def check_and_send_refill_alerts(db: Session, profile: Profile, now_utc: datetime):
    """
    Feature 5: Refill Predictor.
    Calculates days_left = stock_count / doses_per_day.
    When days_left <= threshold, sends ONE deduplicated email to caretaker/family.
    """
    active_meds = db.query(Medication).filter(
        Medication.profile_id == profile.id,
        Medication.is_active.is_(True),
    ).all()

    caretakers = db.query(Member).filter(
        Member.profile_id == profile.id,
        Member.role.in_(["CARETAKER", "FAMILY"]),
        Member.is_active.is_(True),
    ).all()

    for med in active_meds:
        doses_per_day = med.times_per_day or (len(med.schedule_times) if med.schedule_times else 1) or 1
        days_left = max(0, int((med.stock_count or 0) / doses_per_day))
        threshold = med.refill_alert_threshold or 7

        if days_left <= threshold:
            recent_notif = db.query(NotificationLog).filter(
                NotificationLog.profile_id == profile.id,
                NotificationLog.notification_type == f"REFILL_ALERT_{med.id}",
                NotificationLog.created_at >= now_utc - timedelta(days=5),
            ).first()

            if not recent_notif:
                for ct in caretakers:
                    if not ct.email:
                        continue
                    sub, html, txt = build_refill_alert_email(
                        elder_name=profile.elder_name,
                        recipient_name=ct.name,
                        med_name=med.name,
                        dosage=med.dosage,
                        remaining_count=med.stock_count or 0,
                        days_left=days_left,
                    )
                    if send_email(ct.email, sub, html, txt):
                        db.add(NotificationLog(
                            profile_id=profile.id,
                            notification_type=f"REFILL_ALERT_{med.id}",
                            ref_id=med.id,
                            recipient_email=ct.email,
                            recipient_role=ct.role,
                            subject=sub,
                            message_body=txt,
                        ))
                db.commit()


def send_weekly_family_digest(db: Session, profile_id: int, force: bool = False):
    """
    Feature 6: Weekly Family Digest.
    Calculates 7-day adherence %, missed doses, check-in trend, upcoming appointments, refills due,
    and Gemini 2-3 sentence summary.
    Respects each member's privacy permissions.
    """
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    if not profile:
        return {"status": "error", "message": "Profile not found"}

    now_utc = datetime.now(timezone.utc)
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now_local = now_utc.astimezone(user_tz)
    week_start = now_utc - timedelta(days=7)

    sunday_str = now_local.strftime("%Y-%W")
    if not force:
        already_sent = db.query(NotificationLog).filter(
            NotificationLog.profile_id == profile.id,
            NotificationLog.notification_type == f"WEEKLY_DIGEST_{sunday_str}",
        ).first()
        if already_sent:
            return {"status": "already_sent", "message": "Weekly digest already sent for this week"}

    doses = db.query(DoseLog).filter(
        DoseLog.profile_id == profile.id,
        DoseLog.scheduled_at >= week_start,
    ).all()

    total = len(doses)
    taken = sum(1 for d in doses if d.status == "TAKEN")
    adherence_pct = (taken / total * 100) if total > 0 else 100.0

    missed_doses = []
    for d in doses:
        if d.status == "MISSED":
            time_str = ensure_utc(d.scheduled_at).astimezone(user_tz).strftime("%a, %b %d at %I:%M %p")
            missed_doses.append({
                "medication": d.medication.name if d.medication else "Medicine",
                "time": time_str,
            })

    checkins = db.query(CheckIn).filter(
        CheckIn.profile_id == profile.id,
        CheckIn.checkin_date >= (now_local.date() - timedelta(days=7)),
    ).all()

    good_c = sum(1 for c in checkins if c.mood == "GOOD")
    okay_c = sum(1 for c in checkins if c.mood == "OKAY")
    not_well_c = sum(1 for c in checkins if c.mood == "NOT_WELL")

    if checkins:
        checkin_trend = f"{good_c} Good, {okay_c} Okay, {not_well_c} Not Well"
    else:
        checkin_trend = "No check-ins recorded this week"

    apts = db.query(Appointment).filter(
        Appointment.profile_id == profile.id,
        Appointment.scheduled_datetime >= now_utc,
        Appointment.scheduled_datetime <= now_utc + timedelta(days=7),
    ).order_by(Appointment.scheduled_datetime.asc()).all()

    upcoming_apts = []
    for a in apts:
        apt_str = ensure_utc(a.scheduled_datetime).astimezone(user_tz).strftime("%A, %b %d at %I:%M %p")
        upcoming_apts.append({
            "doctor": f"{a.doctor_name} ({a.specialty})",
            "date_time": apt_str,
        })

    meds = db.query(Medication).filter(
        Medication.profile_id == profile.id,
        Medication.is_active.is_(True),
    ).all()

    refills_due = []
    for m in meds:
        doses_per_day = m.times_per_day or 1
        days_left = max(0, int((m.stock_count or 0) / doses_per_day))
        if days_left <= (m.refill_alert_threshold or 7):
            refills_due.append({
                "name": m.name,
                "dosage": m.dosage,
                "days_left": days_left,
            })

    refill_msg = f"Refills are advised soon for {refills_due[0]['name']}." if refills_due else "All medicines have sufficient stock."
    gemini_summary = (
        f"{profile.elder_name} maintained an impressive {adherence_pct:.0f}% medication adherence this week with {taken} out of {total} scheduled doses taken. "
        f"Daily wellbeing was reported as {checkin_trend.lower()}. "
        f"{refill_msg}"
    )

    recipients = db.query(Member).filter(
        Member.profile_id == profile.id,
        Member.is_active.is_(True),
    ).all()

    sent_count = 0
    for rec in recipients:
        if not rec.email:
            continue
        
        hide_meds = False
        if rec.permissions and rec.permissions.get("can_view_medicines") is False:
            hide_meds = True

        sanitized_missed = (
            [{"medication": "Scheduled Dose", "time": m["time"]} for m in missed_doses]
            if hide_meds else missed_doses
        )
        sanitized_refills = (
            [{"name": "Prescribed Medication", "dosage": "", "days_left": r["days_left"]} for r in refills_due]
            if hide_meds else refills_due
        )

        sub, html, txt = build_weekly_digest_email(
            elder_name=profile.elder_name,
            recipient_name=rec.name,
            adherence_pct=adherence_pct,
            missed_doses=sanitized_missed,
            checkin_trend=checkin_trend,
            upcoming_appointments=upcoming_apts,
            refills_due=sanitized_refills,
            gemini_summary=gemini_summary,
            hide_medicine_names=hide_meds,
        )

        if send_email(rec.email, sub, html, txt):
            sent_count += 1
            existing_notif = db.query(NotificationLog).filter(
                NotificationLog.notification_type == f"WEEKLY_DIGEST_{sunday_str}",
                NotificationLog.ref_id == 0,
                NotificationLog.recipient_email == rec.email,
            ).first()
            if existing_notif:
                existing_notif.sent_at = now_utc
                existing_notif.subject = sub
                existing_notif.message_body = txt
            else:
                db.add(NotificationLog(
                    profile_id=profile.id,
                    notification_type=f"WEEKLY_DIGEST_{sunday_str}",
                    ref_id=0,
                    recipient_email=rec.email,
                    recipient_role=rec.role,
                    subject=sub,
                    message_body=txt,
                ))

    db.add(AuditLog(
        profile_id=profile.id,
        actor_name="DawaSaathi 365 Auto-Scheduler",
        action="WEEKLY_FAMILY_DIGEST_SENT",
        details={
            "adherence_pct": round(adherence_pct, 1),
            "members_sent": sent_count,
            "force": force,
        },
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Weekly digest sent to {sent_count} members ({adherence_pct:.0f}% adherence)",
        "adherence_pct": round(adherence_pct, 1),
        "members_sent": sent_count,
    }


def start_scheduler():
    """Start background scheduler to run every 60 seconds."""
    if not scheduler.running:
        scheduler.add_job(
            process_reminders_and_escalations,
            "interval",
            seconds=60,
            id="dawasaathi_reminder_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("🕒 DawaSaathi 365 Proactive Scheduler initialized (60s tick).")
