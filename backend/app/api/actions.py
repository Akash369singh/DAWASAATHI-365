from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DoseLog, ActionToken, AuditLog, SOSEvent, Member, NotificationLog
from app.core.security import verify_action_token
from app.services.email_service import send_email, build_sos_ack_notification_email

router = APIRouter(prefix="/api/actions", tags=["Passwordless Magic Links"])


@router.get("/execute/{token}", response_class=HTMLResponse)
def execute_magic_action_get(token: str, db: Session = Depends(get_db)):
    """Execute single-use signed magic link from email without requiring login."""
    payload = verify_action_token(token)
    if not payload:
        return HTMLResponse(
            content="""
            <html>
            <body style="font-family: system-ui; text-align: center; padding: 48px; background: #F8FAFC;">
                <div style="max-width: 480px; margin: 0 auto; background: white; padding: 32px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <h2 style="color: #EF4444;">Link Expired or Invalid</h2>
                    <p style="color: #64748B;">This magic confirmation link has expired or has already been used.</p>
                </div>
            </body>
            </html>
            """,
            status_code=400,
        )

    action = payload.get("action")
    member_id = payload.get("member_id")

    # Check action token in DB
    act_token_row = db.query(ActionToken).filter(ActionToken.token_hash == token).first()
    if act_token_row and act_token_row.is_used:
        return HTMLResponse(
            content="""
            <html>
            <body style="font-family: system-ui; text-align: center; padding: 48px; background: #F8FAFC;">
                <div style="max-width: 480px; margin: 0 auto; background: white; padding: 32px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <h2 style="color: #0B1F3A;">Already Acknowledged ✓</h2>
                    <p style="color: #64748B;">This action has already been confirmed and processed.</p>
                </div>
            </body>
            </html>
            """
        )

    now = datetime.now(timezone.utc)

    # -------------------------------------------------------------
    # 1. EMERGENCY SOS ACKNOWLEDGMENT ("I'm on it")
    # -------------------------------------------------------------
    if action == "ACK_SOS":
        sos_id = payload.get("sos_event_id")
        sos = db.query(SOSEvent).filter(SOSEvent.id == sos_id).first()
        if not sos:
            raise HTTPException(status_code=404, detail="SOS event not found")

        member = db.query(Member).filter(Member.id == member_id).first() if member_id else None
        responder_name = member.name if member else "Family Responder"

        if sos.status == "RESOLVED":
            return HTMLResponse(
                content=f"""
                <html>
                <body style="font-family: system-ui; text-align: center; padding: 48px; background: #F8FAFC;">
                    <div style="max-width: 480px; margin: 0 auto; background: white; padding: 32px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <h2 style="color: #10B981;">SOS Already Resolved ✓</h2>
                        <p style="color: #64748B;">This emergency alert has already been resolved by {sos.resolved_by or 'the care team'}.</p>
                    </div>
                </body>
                </html>
                """
            )

        # Mark SOS as ACK
        sos.status = "ACK"
        sos.acknowledged_at = now
        sos.acknowledged_by = responder_name
        sos.acknowledged_by_member_id = member_id

        if act_token_row:
            act_token_row.is_used = True
            act_token_row.used_at = now

        # Notify other family members immediately that responder is on it!
        profile = sos.profile
        elder_name = profile.elder_name if profile else "Elder"
        ack_time_str = now.strftime("%I:%M %p UTC")

        other_members = db.query(Member).filter(
            Member.profile_id == sos.profile_id,
            Member.id != member_id,
            Member.is_active.is_(True),
        ).all()

        for om in other_members:
            if om.email:
                sub, html, txt = build_sos_ack_notification_email(
                    elder_name=elder_name,
                    recipient_name=om.name,
                    responder_name=responder_name,
                    ack_time_str=ack_time_str,
                )
                send_email(om.email, sub, html, txt)

        db.add(AuditLog(
            profile_id=sos.profile_id,
            member_id=member_id,
            actor_name=responder_name,
            action="EMERGENCY_SOS_ACKNOWLEDGED",
            details={"sos_id": sos.id, "acknowledged_by": responder_name, "channel": "magic_link"},
        ))
        db.commit()

        return HTMLResponse(
            content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>DawaSaathi 365 - SOS Acknowledged</title>
            </head>
            <body style="margin: 0; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F0FDF4; display: flex; align-items: center; justify-content: center; min-height: 80vh;">
                <div style="max-width: 480px; width: 100%; background: #ffffff; border-radius: 24px; padding: 40px 32px; text-align: center; border: 2px solid #10B981; box-shadow: 0 10px 25px rgba(16,185,129,0.12);">
                    <div style="width: 72px; height: 72px; background: #ECFDF5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <span style="font-size: 36px; color: #10B981;">✓</span>
                    </div>
                    <h1 style="color: #065F46; font-size: 26px; font-weight: 800; margin: 0 0 10px 0;">I'm On It! Acknowledged ✓</h1>
                    <p style="color: #374151; font-size: 17px; line-height: 1.5; margin: 0 0 20px 0;">
                        Thank you, <strong>{responder_name}</strong>. All other care circle members have been notified that you are responding to <strong>{elder_name}</strong>.
                    </p>
                    <div style="background: #ECFDF5; padding: 14px 18px; border-radius: 12px; display: inline-block; font-size: 14px; font-weight: 700; color: #047857;">
                        No login required. Dashboard updated to ACK.
                    </div>
                </div>
            </body>
            </html>
            """
        )

    # -------------------------------------------------------------
    # 2. SNOOZE DOSE ACTION ("Remind me in X min")
    # -------------------------------------------------------------
    if action == "SNOOZE_DOSE":
        dose_log_id = payload.get("dose_log_id")
        minutes = int(payload.get("minutes", 30))
        dose = db.query(DoseLog).filter(DoseLog.id == dose_log_id).first()
        if not dose:
            raise HTTPException(status_code=404, detail="Dose record not found")

        if dose.status != "PENDING":
            return HTMLResponse(
                content=f"""
                <html>
                <body style="font-family: system-ui; text-align: center; padding: 48px; background: #F8FAFC;">
                    <div style="max-width: 480px; margin: 0 auto; background: white; padding: 32px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <h2 style="color: #0B1F3A;">Already Processed</h2>
                        <p style="color: #64748B;">This dose has already been marked as <strong>{dose.status}</strong>.</p>
                    </div>
                </body>
                </html>
                """
            )

        if (dose.snooze_count or 0) >= 2:
            return HTMLResponse(
                content="""
                <html>
                <body style="font-family: system-ui; text-align: center; padding: 48px; background: #F8FAFC;">
                    <div style="max-width: 480px; margin: 0 auto; background: white; padding: 32px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <h2 style="color: #EF4444;">Maximum Snoozes Reached</h2>
                        <p style="color: #64748B;">This dose has already been snoozed twice. Please take or confirm the medication.</p>
                    </div>
                </body>
                </html>
                """,
                status_code=400,
            )

        from datetime import timedelta
        import zoneinfo

        now = datetime.now(timezone.utc)
        dose.snoozed_until = now + timedelta(minutes=minutes)
        dose.snooze_count = (dose.snooze_count or 0) + 1
        dose.escalation_level = 0  # Pause/reset escalation

        if act_token_row:
            act_token_row.is_used = True
            act_token_row.used_at = now

        profile = dose.profile
        elder_name = profile.elder_name if profile else "Elder"
        med_name = dose.medication.name if dose.medication else "Medication"

        try:
            local_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
            snooze_local_str = dose.snoozed_until.astimezone(local_tz).strftime("%I:%M %p")
        except Exception:
            snooze_local_str = dose.snoozed_until.strftime("%H:%M UTC")

        db.add(AuditLog(
            profile_id=dose.profile_id,
            member_id=member_id,
            actor_name="Magic Link Snooze",
            action="DOSE_SNOOZED",
            details={
                "dose_id": dose.id,
                "medication": med_name,
                "minutes": minutes,
                "snoozed_until": dose.snoozed_until.isoformat(),
                "channel": "magic_link",
            },
        ))
        db.commit()

        return HTMLResponse(
            content=f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>DawaSaathi 365 - Dose Snoozed</title>
            </head>
            <body style="margin: 0; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; display: flex; align-items: center; justify-content: center; min-height: 80vh;">
                <div style="max-width: 480px; width: 100%; background: #ffffff; border-radius: 24px; padding: 40px 32px; text-align: center; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px rgba(11,31,58,0.06);">
                    <div style="width: 72px; height: 72px; background: #FEF3C7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <span style="font-size: 32px;">⏳</span>
                    </div>
                    <h1 style="color: #0B1F3A; font-size: 24px; font-weight: 800; margin: 0 0 10px 0;">Dose Snoozed ({minutes} min)</h1>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
                        We will remind <strong>{elder_name}</strong> again at <strong>{snooze_local_str}</strong>. Escalation alerts have been paused.
                    </p>
                    <div style="background: #F1F5F9; padding: 12px 18px; border-radius: 12px; display: inline-block; font-size: 14px; font-weight: 600; color: #334155;">
                        Family will see: "{elder_name} will take it at {snooze_local_str}"
                    </div>
                </div>
            </body>
            </html>
            """
        )

    # -------------------------------------------------------------
    # 3. DOSE ACTIONS (TAKE_DOSE, SKIP_DOSE)
    # -------------------------------------------------------------
    dose_log_id = payload.get("dose_log_id")
    dose = db.query(DoseLog).filter(DoseLog.id == dose_log_id).first()
    if not dose:
        raise HTTPException(status_code=404, detail="Dose record not found")

    now = datetime.now(timezone.utc)
    if action == "TAKE_DOSE":
        dose.status = "TAKEN"
        dose.acted_at = now
        dose.acted_by_member_id = member_id
        if dose.medication and dose.medication.stock_count > 0:
            dose.medication.stock_count -= 1
    elif action == "SKIP_DOSE":
        dose.status = "SKIPPED"
        dose.acted_at = now
        dose.acted_by_member_id = member_id

    if act_token_row:
        act_token_row.is_used = True
        act_token_row.used_at = now

    db.add(AuditLog(
        profile_id=dose.profile_id,
        member_id=member_id,
        actor_name="Magic Link Actor",
        action=f"MAGIC_{action}",
        details={"dose_id": dose.id, "medication": dose.medication.name if dose.medication else "Medicine"},
    ))
    db.commit()

    med_name = dose.medication.name if dose.medication else "Medication"
    dosage = dose.medication.dosage if dose.medication else ""

    return HTMLResponse(
        content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>DawaSaathi 365 - Dose Confirmed</title>
        </head>
        <body style="margin: 0; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F9FB; display: flex; align-items: center; justify-content: center; min-height: 80vh;">
            <div style="max-width: 480px; width: 100%; background: #ffffff; border-radius: 24px; padding: 40px 32px; text-align: center; border: 1px solid #E6EBF1; box-shadow: 0 10px 25px rgba(11,31,58,0.06);">
                <div style="width: 72px; height: 72px; background: #ECFDF5; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                    <span style="font-size: 36px; color: #10B981;">✓</span>
                </div>
                <h1 style="color: #0B1F3A; font-size: 26px; font-weight: 800; margin: 0 0 10px 0;">Dose Recorded!</h1>
                <p style="color: #4B5563; font-size: 17px; line-height: 1.5; margin: 0 0 24px 0;">
                    <strong>{med_name}</strong> ({dosage}) has been confirmed as taken. The care circle dashboard has been updated live.
                </p>
                <div style="background: #F0FDFA; padding: 12px 18px; border-radius: 12px; display: inline-block; font-size: 14px; font-weight: 600; color: #0D9488;">
                    No login was required. DawaSaathi 365 closed-loop active.
                </div>
            </div>
        </body>
        </html>
        """
    )
