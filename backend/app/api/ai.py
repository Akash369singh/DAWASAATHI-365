from datetime import datetime, timedelta, timezone
import zoneinfo
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, Medication, DoseLog, Appointment, HealthVital
from app.schemas.ai import (
    PrescriptionScanResponse,
    NLParseRequest,
    NLParseResponse,
    AIInsightResponse,
    VoiceChatRequest,
    VoiceChatResponse,
    MedicineEncyclopediaRequest,
    MedicineEncyclopediaResponse,
)
from app.core.deps import get_current_member, get_current_profile
from app.services.ai_service import (
    extract_prescription_ocr,
    parse_natural_language,
    generate_ai_insights,
    elder_companion_chat,
    lookup_medicine_encyclopedia,
    identify_medicine_from_image,
)

router = APIRouter(prefix="/api/ai", tags=["AI Intelligence (Gemini-Powered)"])


@router.post("/scan-prescription", response_model=PrescriptionScanResponse)
async def scan_prescription(
    file: Optional[UploadFile] = File(None),
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
):
    """Upload a prescription image to extract structured medications draft with Gemini Vision OCR."""
    if file:
        content = await file.read()
        mime_type = file.content_type or "image/jpeg"
    else:
        content = b""
        mime_type = "image/jpeg"

    result = extract_prescription_ocr(content, mime_type=mime_type)
    return PrescriptionScanResponse(**result)


@router.post("/parse-nl", response_model=NLParseResponse)
def parse_nl_input(
    payload: NLParseRequest,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
):
    """Convert natural language voice or typed text (Hinglish/Hindi/English) into structured schedule entry."""
    result = parse_natural_language(payload.text, user_timezone=profile.timezone or "Asia/Kolkata")
    return NLParseResponse(**result)


def ensure_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@router.get("/insights", response_model=AIInsightResponse)
def get_insights(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Generate weekly plain-language adherence insights and Doctor Visit Brief from real dose logs."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now = datetime.now(timezone.utc)
    start_30d = now - timedelta(days=30)

    # 1. Fetch real dose logs over 30 days
    all_doses = db.query(DoseLog).filter(
        DoseLog.profile_id == profile.id,
    ).all()

    dose_logs = [d for d in all_doses if ensure_utc(d.scheduled_at) >= start_30d]

    total_doses = len(dose_logs)
    taken_doses = sum(1 for d in dose_logs if d.status == "TAKEN")
    missed_doses = sum(1 for d in dose_logs if d.status == "MISSED")
    skipped_doses = sum(1 for d in dose_logs if d.status == "SKIPPED")
    adherence_pct = round((taken_doses / total_doses * 100.0), 1) if total_doses > 0 else 100.0

    # 2. Analyze patterns (e.g. weekend evening lapses)
    weekend_evening_misses = 0
    for d in dose_logs:
        local_time = ensure_utc(d.scheduled_at).astimezone(user_tz)
        if local_time.weekday() in [5, 6] and local_time.hour >= 19 and d.status == "MISSED":
            weekend_evening_misses += 1

    patterns = []
    if weekend_evening_misses >= 2:
        patterns.append(f"Weekend evening doses showed {weekend_evening_misses} delayed or missed instances after 7:30 PM.")
    else:
        patterns.append("Medication schedules are consistently followed throughout the week.")

    # 3. Active medications
    meds = db.query(Medication).filter(
        Medication.profile_id == profile.id,
        Medication.is_active.is_(True),
    ).all()
    med_list = [{"name": m.name, "dosage": m.dosage, "schedule": m.schedule_times, "instructions": m.instructions} for m in meds]

    # 4. Recent vitals
    vitals = db.query(HealthVital).filter(
        HealthVital.profile_id == profile.id,
    ).order_by(HealthVital.recorded_at.desc()).limit(5).all()
    vitals_list = [
        {"type": v.vital_type, "value": v.value_numeric, "secondary": v.value_secondary, "unit": v.unit}
        for v in vitals
    ]

    # 5. Upcoming appointments
    all_apts = db.query(Appointment).filter(
        Appointment.profile_id == profile.id,
        Appointment.status == "SCHEDULED",
    ).all()
    upcoming_apts = [a for a in all_apts if ensure_utc(a.scheduled_datetime) >= now]
    upcoming_apts.sort(key=lambda a: ensure_utc(a.scheduled_datetime))
    upcoming_apts = upcoming_apts[:3]

    apt_list = [
        {"doctor": a.doctor_name, "specialty": a.specialty, "date": ensure_utc(a.scheduled_datetime).astimezone(user_tz).strftime("%b %d")}
        for a in upcoming_apts
    ]

    result = generate_ai_insights(
        profile_name=profile.name,
        elder_name=profile.elder_name,
        elder_age=profile.elder_age,
        adherence_pct=adherence_pct,
        total_doses=total_doses,
        taken_doses=taken_doses,
        missed_doses=missed_doses,
        skipped_doses=skipped_doses,
        recent_patterns=patterns,
        current_medications=med_list,
        recent_vitals=vitals_list,
        upcoming_appointments=apt_list,
    )

    return AIInsightResponse(**result)


@router.post("/companion-chat", response_model=VoiceChatResponse)
def companion_chat(
    payload: VoiceChatRequest,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Conversational voice/text companion for the elder (DawaSaathi AI)."""
    try:
        user_tz = zoneinfo.ZoneInfo(profile.timezone or "Asia/Kolkata")
    except Exception:
        user_tz = zoneinfo.ZoneInfo("Asia/Kolkata")

    now = datetime.now(timezone.utc)
    start_today = datetime.combine(datetime.now(user_tz).date(), datetime.min.time(), tzinfo=user_tz).astimezone(timezone.utc)

    # Fetch today's context
    today_doses = db.query(DoseLog).filter(
        DoseLog.profile_id == profile.id,
        DoseLog.scheduled_at >= start_today,
    ).order_by(DoseLog.scheduled_at.asc()).all()

    context_lines = []
    for d in today_doses:
        time_str = d.scheduled_at.astimezone(user_tz).strftime("%I:%M %p")
        context_lines.append(f"- {d.medication.name} ({d.medication.dosage}): Scheduled {time_str}, Status: {d.status}")

    next_apt = db.query(Appointment).filter(
        Appointment.profile_id == profile.id,
        Appointment.scheduled_datetime >= now,
        Appointment.status == "SCHEDULED",
    ).order_by(Appointment.scheduled_datetime.asc()).first()

    if next_apt:
        apt_str = next_apt.scheduled_datetime.astimezone(user_tz).strftime("%b %d at %I:%M %p")
        context_lines.append(f"Next Appointment: {next_apt.doctor_name} ({next_apt.specialty}) on {apt_str}")

    context_str = "\n".join(context_lines)

    result = elder_companion_chat(
        elder_name=profile.elder_name,
        user_message=payload.message,
        schedule_context=context_str,
        history=payload.history,
    )
    return VoiceChatResponse(**result)


@router.post("/medicine-info", response_model=MedicineEncyclopediaResponse)
def get_medicine_info(
    payload: MedicineEncyclopediaRequest,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
):
    """
    Omni-Medicine Encyclopedia:
    Search any medicine in the world by name, brand, or salt to retrieve
    comprehensive indications, who should take it, how and when to take,
    elderly precautions, side effects, and food/drug interactions.
    """
    result = lookup_medicine_encyclopedia(payload.query)
    return MedicineEncyclopediaResponse(**result)


@router.post("/identify-medicine-photo", response_model=MedicineEncyclopediaResponse)
async def identify_medicine_photo(
    file: UploadFile = File(...),
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
):
    """
    AI Camera / Photo Pill & Strip Identifier:
    Upload or snap a photo of a medicine strip/bottle to identify the medicine
    and immediately return the complete clinical monograph.
    """
    content = await file.read()
    mime_type = file.content_type or "image/jpeg"
    result = identify_medicine_from_image(content, mime_type=mime_type)
    return MedicineEncyclopediaResponse(**result)
