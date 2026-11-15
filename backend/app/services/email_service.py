import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from typing import List, Optional
import zoneinfo

from app.config import settings


def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """Send an email using SMTP or log to console if EMAIL_MODE=console."""
    if settings.EMAIL_MODE == "console" or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "=" * 70)
        print(f"📧 [CONSOLE EMAIL DISPATCH] To: {to_email}")
        print(f"📌 Subject: {subject}")
        print("-" * 70)
        print(text_body.strip())
        print("=" * 70 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email

        part1 = MIMEText(text_body, "plain", "utf-8")
        part2 = MIMEText(html_body, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        return True
    except Exception as exc:
        print(f"❌ Failed to dispatch SMTP email to {to_email}: {exc}")
        return False


def build_upcoming_dose_email(
    elder_name: str,
    med_name: str,
    dosage: str,
    instructions: Optional[str],
    scheduled_time_str: str,
    magic_take_url: str,
    magic_snooze_url: Optional[str] = None,
) -> tuple[str, str, str]:
    subject = f"⏰ Reminder: {elder_name}, time for {med_name} ({dosage})"
    
    snooze_text = (
        f"\nRunning late? Click below to remind you in 30 minutes (pauses alerts):\n👉 {magic_snooze_url}\n"
        if magic_snooze_url
        else ""
    )

    text_body = f"""
Hello {elder_name},

It is almost time for your scheduled medication:
💊 {med_name} - {dosage}
🕒 Scheduled Time: {scheduled_time_str}
ℹ️ Instructions: {instructions or 'Take as prescribed'}

Took it already? Click below to confirm in one click (no login needed):
👉 {magic_take_url}
{snooze_text}
Stay well,
DawaSaathi 365 Closed-Loop Health Companion
"""

    snooze_btn_html = (
        f"""
        <div style="margin-top: 14px;">
          <a href="{magic_snooze_url}" style="display: inline-block; background-color: #F1F5F9; color: #475569; text-decoration: none; padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 10px; border: 1px solid #CBD5E1;">
            ⏳ Running late? Remind me in 30 min
          </a>
        </div>
        """
        if magic_snooze_url
        else ""
    )

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F9FB;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #E6EBF1; box-shadow: 0 4px 12px rgba(11,31,58,0.05);">
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
      <span style="font-size: 24px; font-weight: bold; color: #0B1F3A;">DawaSaathi 365</span>
      <span style="margin-left: 8px; font-size: 13px; color: #14B8A6; background: #E6FFFA; padding: 4px 10px; border-radius: 999px; font-weight: 600;">Upcoming Dose</span>
    </div>
    
    <h2 style="color: #0B1F3A; font-size: 22px; margin-top: 0;">Time for your medicine, {elder_name}</h2>
    
    <div style="background: #F0FDFA; border-left: 4px solid #14B8A6; padding: 16px 20px; border-radius: 12px; margin: 20px 0;">
      <div style="font-size: 20px; font-weight: 700; color: #0B1F3A;">{med_name} <span style="font-size: 16px; font-weight: 500; color: #4B5563;">({dosage})</span></div>
      <div style="font-size: 15px; color: #14B8A6; font-weight: 600; margin-top: 4px;">🕒 Due at {scheduled_time_str}</div>
      <div style="font-size: 14px; color: #6B7280; margin-top: 6px;">Instructions: {instructions or 'Take as prescribed'}</div>
    </div>

    <div style="text-align: center; margin: 32px 0 24px 0;">
      <a href="{magic_take_url}" style="display: inline-block; background-color: #14B8A6; color: #ffffff; text-decoration: none; padding: 16px 36px; font-size: 18px; font-weight: 700; border-radius: 14px; box-shadow: 0 4px 14px rgba(20,184,166,0.35);">
        I took it ✓
      </a>
      <div style="font-size: 13px; color: #9CA3AF; margin-top: 10px;">One-click confirmation — no password required.</div>
      {snooze_btn_html}
    </div>

    <hr style="border: none; border-top: 1px solid #E6EBF1; margin: 24px 0;" />
    <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin: 0;">
      DawaSaathi 365 Closed-Loop Health Companion • The elder stays in control.
    </p>
  </div>
</body>
</html>
"""
    return subject, html_body, text_body


def build_escalation_alert_email(
    elder_name: str,
    recipient_name: str,
    med_name: str,
    dosage: str,
    scheduled_time_str: str,
    escalation_role: str,
    magic_take_url: str,
) -> tuple[str, str, str]:
    subject = f"⚠️ Alert: {elder_name} has an unconfirmed dose of {med_name}"
    
    text_body = f"""
Hello {recipient_name},

DawaSaathi 365 Escalation Notice:
{elder_name} was scheduled to take {med_name} ({dosage}) at {scheduled_time_str}.
This dose has not been marked as taken yet.

As an authorized {escalation_role}, you are receiving this update so you can check in.

If {elder_name} has taken this medication, click here to mark it taken:
👉 {magic_take_url}

DawaSaathi 365 Care Team
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F9FB;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #FED7AA; box-shadow: 0 4px 12px rgba(11,31,58,0.05);">
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
      <span style="font-size: 24px; font-weight: bold; color: #0B1F3A;">DawaSaathi 365</span>
      <span style="margin-left: 8px; font-size: 13px; color: #C2410C; background: #FFEDD5; padding: 4px 10px; border-radius: 999px; font-weight: 600;">{escalation_role} Escalation</span>
    </div>
    
    <h2 style="color: #9A3412; font-size: 22px; margin-top: 0;">Unconfirmed Dose for {elder_name}</h2>
    <p style="font-size: 15px; color: #4B5563;">Hello {recipient_name}, the scheduled time for {elder_name}'s medication has passed without acknowledgment.</p>

    <div style="background: #FFF7ED; border-left: 4px solid #F97316; padding: 16px 20px; border-radius: 12px; margin: 20px 0;">
      <div style="font-size: 20px; font-weight: 700; color: #0B1F3A;">{med_name} <span style="font-size: 16px; font-weight: 500; color: #4B5563;">({dosage})</span></div>
      <div style="font-size: 15px; color: #C2410C; font-weight: 600; margin-top: 4px;">🕒 Scheduled for {scheduled_time_str}</div>
    </div>

    <p style="font-size: 14px; color: #6B7280;">Please give {elder_name} a gentle call or check in. If you have confirmed they took it, you can mark it as taken right here:</p>

    <div style="text-align: center; margin: 28px 0 20px 0;">
      <a href="{magic_take_url}" style="display: inline-block; background-color: #14B8A6; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 16px; font-weight: 700; border-radius: 12px;">
        Mark as Taken ✓
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #E6EBF1; margin: 24px 0;" />
    <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin: 0;">
      DawaSaathi 365 • Escalated only when it matters.
    </p>
  </div>
</body>
</html>
"""
    return subject, html_body, text_body


def build_appointment_reminder_email(
    elder_name: str,
    recipient_name: str,
    doctor_name: str,
    specialty: str,
    location: str,
    date_time_str: str,
    hours_prior: int,
) -> tuple[str, str, str]:
    timing_label = "Tomorrow" if hours_prior >= 24 else "In 2 hours"
    subject = f"🗓️ Doctor Appointment {timing_label}: {elder_name} with {doctor_name}"
    
    text_body = f"""
Hello {recipient_name},

Reminder for {elder_name}'s upcoming appointment:
👨‍⚕️ Doctor: {doctor_name} ({specialty})
🕒 Time: {date_time_str}
📍 Location: {location}

Please ensure prescriptions, recent reports, and health questions are kept ready.

DawaSaathi 365 Care Companion
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F9FB;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #E6EBF1; box-shadow: 0 4px 12px rgba(11,31,58,0.05);">
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
      <span style="font-size: 24px; font-weight: bold; color: #0B1F3A;">DawaSaathi 365</span>
      <span style="margin-left: 8px; font-size: 13px; color: #2563EB; background: #EFF6FF; padding: 4px 10px; border-radius: 999px; font-weight: 600;">Appointment Alert</span>
    </div>
    
    <h2 style="color: #0B1F3A; font-size: 22px; margin-top: 0;">Upcoming Appointment for {elder_name}</h2>
    
    <div style="background: #F8FAFC; border-left: 4px solid #3B82F6; padding: 18px 20px; border-radius: 12px; margin: 20px 0;">
      <div style="font-size: 19px; font-weight: 700; color: #0B1F3A;">{doctor_name}</div>
      <div style="font-size: 14px; color: #2563EB; font-weight: 600; margin-top: 2px;">{specialty}</div>
      <div style="font-size: 15px; color: #1E293B; margin-top: 8px;">🕒 <strong>{date_time_str}</strong></div>
      <div style="font-size: 14px; color: #64748B; margin-top: 4px;">📍 {location}</div>
    </div>

    <div style="background: #F0FDFA; padding: 14px 16px; border-radius: 10px; font-size: 14px; color: #0F766E;">
      💡 Tip: Keep recent blood sugar/BP logs and the Doctor Visit Brief handy for consultation.
    </div>

    <hr style="border: none; border-top: 1px solid #E6EBF1; margin: 24px 0;" />
    <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin: 0;">
      DawaSaathi 365 • Proactive Healthcare Coordination
    </p>
  </div>
</body>
</html>
"""
    return subject, html_body, text_body


def build_emergency_sos_email(
    elder_name: str,
    recipient_name: str,
    emergency_timestamp: str,
    triggered_by: str = "Elder",
    maps_url: Optional[str] = None,
    magic_ack_url: Optional[str] = None,
    notes: Optional[str] = None,
    is_escalation: bool = False,
) -> tuple[str, str, str]:
    if is_escalation:
        subject = f"🔴 CRITICAL 5-MIN ESCALATION: Emergency SOS for {elder_name} NOT YET ACKNOWLEDGED!"
        badge = "🔴 CRITICAL 5-MIN ESCALATION"
        headline = f"URGENT: Emergency SOS for {elder_name} Still Unacknowledged"
    else:
        subject = f"🚨 EMERGENCY SOS ACTIVATED by {triggered_by} for {elder_name}!"
        badge = "🚨 EMERGENCY SOS ACTIVATED"
        headline = f"Emergency SOS Alert for {elder_name}"

    text_body = f"""
{badge}
Elder: {elder_name}
Triggered By: {triggered_by}
Timestamp: {emergency_timestamp}
{f'Location: {maps_url}' if maps_url else 'Location: Not shared by browser'}
{f'Note: {notes}' if notes else ''}

{f"CLICK HERE TO ACKNOWLEDGE ('I'm on it'): {magic_ack_url}" if magic_ack_url else ""}

Please immediately check on {elder_name} or call emergency services if required!

DawaSaathi 365 Emergency Response Hub
"""

    maps_html = f"""
    <div style="margin: 16px 0; padding: 14px 16px; background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 12px;">
      <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: bold;">📍 Location Shared:</p>
      <a href="{maps_url}" target="_blank" style="display: inline-block; margin-top: 6px; color: #1D4ED8; font-weight: bold; text-decoration: underline;">
        Open in Google Maps ➔
      </a>
    </div>
    """ if maps_url else ""

    ack_button_html = f"""
    <div style="text-align: center; margin: 24px 0;">
      <a href="{magic_ack_url}" target="_blank" style="background-color: #EF4444; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 14px; font-weight: 800; font-size: 18px; display: inline-block; box-shadow: 0 4px 14px rgba(239,68,68,0.4);">
        🚨 I'm on it / Acknowledge
      </a>
      <div style="font-size: 13px; color: #6B7280; margin-top: 10px;">
        Clicking this notifies all other family members that you are responding. No login required.
      </div>
    </div>
    """ if magic_ack_url else ""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FEF2F2;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 2px solid #EF4444; box-shadow: 0 4px 18px rgba(239,68,68,0.2);">
    <div style="background: {'#991B1B' if is_escalation else '#EF4444'}; color: white; display: inline-block; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 14px; margin-bottom: 16px;">
      {badge}
    </div>
    
    <h2 style="color: #991B1B; font-size: 24px; margin: 0 0 12px 0;">{headline}</h2>
    <p style="font-size: 16px; color: #1F2937; line-height: 1.5;">
      Hello <strong>{recipient_name}</strong>,<br/>
      Emergency SOS was triggered by <strong>{triggered_by}</strong> for <strong>{elder_name}</strong> at <strong>{emergency_timestamp}</strong>.
    </p>

    {maps_html}

    {ack_button_html}

    <div style="background: #FEE2E2; border: 1px solid #FCA5A5; padding: 16px; border-radius: 12px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #991B1B; font-weight: 600;">
        Action Required: Please check on {elder_name} immediately or reach their primary caretaker.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #FEE2E2; margin: 24px 0;" />
    <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin: 0;">
      DawaSaathi 365 Emergency Response System • Real-Time Safety Circuit
    </p>
  </div>
</body>
</html>
"""
    return subject, html_body, text_body


def build_medication_emergency_email(
    elder_name: str,
    recipient_name: str,
    incident_type: str,
    medication_name: str,
    dosage: Optional[str],
    symptoms: Optional[str],
    emergency_timestamp: str,
    triggered_by: str,
    maps_url: Optional[str] = None,
    magic_ack_url: Optional[str] = None,
    notes: Optional[str] = None,
) -> tuple[str, str, str]:
    incident_titles = {
        "OVERDOSE": "Potential Overdose / Accidental Double Dose",
        "WRONG_MEDICINE": "Wrong Medication Taken by Mistake",
        "ADVERSE_REACTION": "Severe Adverse Reaction / Health Distress",
        "ACCIDENTAL_DOUBLE_DOSE": "Accidental Double Dose Ingestion",
    }
    incident_display = incident_titles.get(incident_type, incident_type.replace("_", " ").title())

    subject = f"🚨 URGENT MEDICAL EMERGENCY: {incident_display} reported for {elder_name}!"
    badge = f"🚨 URGENT MEDICAL EMERGENCY: {incident_display.upper()}"
    headline = f"Emergency Alert: {incident_display}"

    text_body = f"""
{badge}
Elder: {elder_name}
Triggered By: {triggered_by}
Timestamp: {emergency_timestamp}
Medicine Involved: {medication_name or 'Not specified'} {f'({dosage})' if dosage else ''}
Symptoms / Details: {symptoms or 'Elder reported taking an unintended or extra dose'}
{f'Notes: {notes}' if notes else ''}
{f'Location: {maps_url}' if maps_url else 'Location: Not shared by device'}

🚨 CRITICAL SAFETY DIRECTIVES:
1. Do NOT induce vomiting unless instructed by a qualified doctor or poison control.
2. Keep the medicine box, foil strip, and prescription ready for doctors or emergency responders.
3. Call emergency services (112 / 108) immediately if the patient feels faint, nauseous, or breathless.
4. Check in on {elder_name} right now.

{f"CLICK HERE TO ACKNOWLEDGE ('I'm on it / Attending'): {magic_ack_url}" if magic_ack_url else ""}

DawaSaathi 365 Medical Safety Hub
"""

    maps_html = f"""
    <div style="margin: 16px 0; padding: 14px 16px; background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 12px;">
      <p style="margin: 0; font-size: 14px; color: #92400E; font-weight: bold;">📍 Location Shared:</p>
      <a href="{maps_url}" target="_blank" style="display: inline-block; margin-top: 6px; color: #1D4ED8; font-weight: bold; text-decoration: underline;">
        Open in Google Maps ➔
      </a>
    </div>
    """ if maps_url else ""

    ack_button_html = f"""
    <div style="text-align: center; margin: 24px 0;">
      <a href="{magic_ack_url}" target="_blank" style="background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 14px; font-weight: 800; font-size: 18px; display: inline-block; box-shadow: 0 4px 14px rgba(220,38,38,0.4);">
        🚨 I'm On It / Attending Now
      </a>
      <div style="font-size: 13px; color: #6B7280; margin-top: 10px;">
        Clicking this notifies all other family members that you are responding. No login required.
      </div>
    </div>
    """ if magic_ack_url else ""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FEF2F2;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 2px solid #DC2626; box-shadow: 0 4px 18px rgba(220,38,38,0.25);">
    <div style="background: #991B1B; color: white; display: inline-block; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 13px; margin-bottom: 16px; letter-spacing: 0.5px;">
      {badge}
    </div>
    
    <h2 style="color: #991B1B; font-size: 24px; margin: 0 0 12px 0;">{headline}</h2>
    <p style="font-size: 16px; color: #1F2937; line-height: 1.5;">
      Hello <strong>{recipient_name}</strong>,<br/>
      An urgent medication emergency alert was reported by <strong>{triggered_by}</strong> for <strong>{elder_name}</strong> at <strong>{emergency_timestamp}</strong>.
    </p>

    <!-- Medication Incident Detail Box -->
    <div style="background: #FFF1F2; border: 2px solid #FDA4AF; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #BE123C; letter-spacing: 0.5px;">Reported Medicine & Circumstances</div>
      <div style="font-size: 18px; font-weight: 800; color: #881337; margin-top: 4px;">
        {medication_name or 'Unspecified Medication'} {f'<span style="font-size: 14px; font-weight: 600; color: #9F1239;">({dosage})</span>' if dosage else ''}
      </div>
      {f'<div style="font-size: 14px; color: #4C0519; margin-top: 8px; background: #FFE4E6; padding: 10px 14px; border-radius: 8px;"><strong>Symptoms / Description:</strong> {symptoms}</div>' if symptoms else ''}
      {f'<div style="font-size: 13px; color: #64748B; margin-top: 6px;"><strong>Additional Note:</strong> {notes}</div>' if notes else ''}
    </div>

    {maps_html}

    {ack_button_html}

    <!-- First Aid Emergency Protocols -->
    <div style="background: #FEFCE8; border: 1px solid #FEF08A; padding: 18px 20px; border-radius: 14px; margin: 20px 0;">
      <div style="font-size: 14px; font-weight: 800; color: #854D0E; margin-bottom: 8px;">
        ⚠️ Immediate Clinical First-Aid Instructions:
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #713F12; line-height: 1.6;">
        <li><strong>DO NOT</strong> induce vomiting unless explicitly directed by a medical professional or poison center.</li>
        <li><strong>Keep the medicine package/strip</strong> ready immediately to show attending doctors.</li>
        <li><strong>Call emergency medical helpline (112 / 108)</strong> if {elder_name} shows dizziness, unresponsiveness, breathlessness, or vomiting.</li>
        <li>Reach out to {elder_name}'s treating doctor without delay.</li>
      </ul>
    </div>

    <hr style="border: none; border-top: 1px solid #FEE2E2; margin: 24px 0;" />
    <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin: 0;">
      DawaSaathi 365 Emergency Response System • Closed-Loop Medication Safety
    </p>
  </div>
</body>
</html>
"""
    return subject, html_body, text_body


def build_sos_ack_notification_email(
    elder_name: str,
    recipient_name: str,
    responder_name: str,
    ack_time_str: str,
) -> tuple[str, str, str]:
    subject = f"ℹ️ Update: {responder_name} is responding to {elder_name}'s SOS"
    
    text_body = f"""
Hello {recipient_name},

Good news: {responder_name} has acknowledged {elder_name}'s Emergency SOS at {ack_time_str} and is responding to it ("I'm on it").

DawaSaathi 365 Emergency Hub
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F0FDF4;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 2px solid #10B981; box-shadow: 0 4px 18px rgba(16,185,129,0.15);">
    <div style="background: #10B981; color: white; display: inline-block; padding: 6px 14px; border-radius: 8px; font-weight: 800; font-size: 14px; margin-bottom: 16px;">
      ✓ SOS RESPONDER UPDATE
    </div>
    <h2 style="color: #065F46; font-size: 22px; margin: 0 0 12px 0;">{responder_name} is on it!</h2>
    <p style="font-size: 16px; color: #1F2937; line-height: 1.5;">
      Hello <strong>{recipient_name}</strong>,<br/>
      <strong>{responder_name}</strong> has confirmed they are handling the SOS for <strong>{elder_name}</strong> (acknowledged at {ack_time_str}).
    </p>
    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; padding: 14px 18px; border-radius: 12px; margin-top: 20px; color: #047857; font-size: 14px; font-weight: 600;">
      DawaSaathi 365 dashboard has updated all members.
    </div>
  </div>
</body>
</html>
"""
    return subject, html_body, text_body
