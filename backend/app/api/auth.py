import random
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, AuditLog
from app.schemas.auth import (
    LoginRequest,
    ProfileCreateRequest,
    MemberInviteRequest,
    ProfileSettingsUpdate,
    TokenResponse,
)
from app.core.security import hash_passcode, verify_passcode, create_access_token
from app.core.deps import get_current_member, get_current_profile, RoleChecker

router = APIRouter(prefix="/api/auth", tags=["Authentication & Profiles"])


def generate_profile_code(db: Session) -> str:
    """Generate a unique human-friendly care profile code like CARE-8492."""
    for _ in range(10):
        digits = "".join(random.choices(string.digits, k=4))
        code = f"CARE-{digits}"
        if not db.query(Profile).filter(Profile.code == code).first():
            return code
    return f"CARE-{random.randint(10000, 99999)}"


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Passcode-based login to a DawaSaathi 365 profile with 5-attempt rate-limit lockout."""
    profile = db.query(Profile).filter(Profile.code == payload.profile_code.upper().strip()).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid profile code")

    now = datetime.now(timezone.utc)

    # Find matching active member in this profile with this passcode
    members = db.query(Member).filter(Member.profile_id == profile.id, Member.is_active.is_(True)).all()
    matched_member = None

    for m in members:
        # Check if member is locked out
        if m.locked_until and m.locked_until > now:
            minutes_left = int((m.locked_until - now).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked due to failed attempts. Try again in {minutes_left} minutes.",
            )

        if verify_passcode(payload.passcode.strip(), m.passcode_hash):
            matched_member = m
            break

    if not matched_member:
        # Increment failed attempts on the profile's first active member or record attempt
        if members:
            first_m = members[0]
            first_m.failed_login_attempts += 1
            if first_m.failed_login_attempts >= 5:
                first_m.locked_until = now + timedelta(minutes=5)
                first_m.failed_login_attempts = 0
            db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect passcode for this DawaSaathi 365 profile",
        )

    # Successful login: reset failed attempts
    matched_member.failed_login_attempts = 0
    matched_member.locked_until = None

    # Log audit entry
    db.add(AuditLog(
        profile_id=profile.id,
        member_id=matched_member.id,
        actor_name=matched_member.name,
        action="MEMBER_LOGIN",
        details={"role": matched_member.role, "time": now.isoformat()},
    ))
    db.commit()

    token = create_access_token({
        "sub": str(matched_member.id),
        "profile_id": profile.id,
        "profile_code": profile.code,
        "role": matched_member.role,
        "name": matched_member.name,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        member_id=matched_member.id,
        member_name=matched_member.name,
        role=matched_member.role,
        profile_id=profile.id,
        profile_code=profile.code,
        elder_name=profile.elder_name,
        elder_age=profile.elder_age,
        timezone=profile.timezone,
        permissions=matched_member.permissions or {},
    )


@router.post("/create-profile", response_model=TokenResponse)
def create_profile(payload: ProfileCreateRequest, db: Session = Depends(get_db)):
    """Create a new DawaSaathi 365 profile and owner account."""
    code = generate_profile_code(db)
    
    profile = Profile(
        code=code,
        name=payload.name,
        elder_name=payload.elder_name,
        elder_age=payload.elder_age,
        timezone=payload.timezone,
    )
    db.add(profile)
    db.flush()

    default_perms = {
        "can_edit_meds": True,
        "view_all_meds": True,
        "view_appointments": True,
        "receive_missed_alerts": payload.creator_role != "ELDER",
    }

    creator = Member(
        profile_id=profile.id,
        name=payload.creator_name,
        email=payload.creator_email,
        phone=payload.creator_phone,
        role=payload.creator_role,
        passcode_hash=hash_passcode(payload.passcode),
        permissions=default_perms,
    )
    db.add(creator)
    db.flush()

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=creator.id,
        actor_name=creator.name,
        action="PROFILE_CREATED",
        details={"profile_code": code, "elder_name": payload.elder_name},
    ))
    db.commit()

    token = create_access_token({
        "sub": str(creator.id),
        "profile_id": profile.id,
        "profile_code": profile.code,
        "role": creator.role,
        "name": creator.name,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        member_id=creator.id,
        member_name=creator.name,
        role=creator.role,
        profile_id=profile.id,
        profile_code=profile.code,
        elder_name=profile.elder_name,
        elder_age=profile.elder_age,
        timezone=profile.timezone,
        permissions=creator.permissions or {},
    )


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(role: str = "ELDER", db: Session = Depends(get_db)):
    """One-click instant login into demo profile CARE-7291 for judges and evaluation."""
    profile = db.query(Profile).filter(Profile.code == "CARE-7291").first()
    if not profile:
        from seed import seed_database
        seed_database(db)
        profile = db.query(Profile).filter(Profile.code == "CARE-7291").first()

    target_role = role.upper()
    member = db.query(Member).filter(
        Member.profile_id == profile.id,
        Member.role == target_role,
        Member.is_active.is_(True),
    ).first()

    if not member:
        member = db.query(Member).filter(Member.profile_id == profile.id).first()

    token = create_access_token({
        "sub": str(member.id),
        "profile_id": profile.id,
        "profile_code": profile.code,
        "role": member.role,
        "name": member.name,
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        member_id=member.id,
        member_name=member.name,
        role=member.role,
        profile_id=profile.id,
        profile_code=profile.code,
        elder_name=profile.elder_name,
        elder_age=profile.elder_age,
        timezone=profile.timezone,
        permissions=member.permissions or {},
    )


@router.get("/me", response_model=TokenResponse)
def get_me(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
):
    """Retrieve current session profile and member information."""
    return TokenResponse(
        access_token="",
        token_type="bearer",
        member_id=member.id,
        member_name=member.name,
        role=member.role,
        profile_id=profile.id,
        profile_code=profile.code,
        elder_name=profile.elder_name,
        elder_age=profile.elder_age,
        timezone=profile.timezone,
        permissions=member.permissions or {},
    )


@router.put("/profile")
def update_profile_settings(
    payload: ProfileSettingsUpdate,
    member: Member = Depends(RoleChecker(["ELDER", "CARETAKER"])),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Update profile settings (grace window, escalation ladder timings, timezone)."""
    if payload.name is not None:
        profile.name = payload.name
    if payload.grace_window_minutes is not None:
        profile.grace_window_minutes = payload.grace_window_minutes
    if payload.escalation_level_1_mins is not None:
        profile.escalation_level_1_mins = payload.escalation_level_1_mins
    if payload.escalation_level_2_mins is not None:
        profile.escalation_level_2_mins = payload.escalation_level_2_mins
    if payload.timezone is not None:
        profile.timezone = payload.timezone

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="PROFILE_SETTINGS_UPDATED",
        details=payload.model_dump(exclude_unset=True),
    ))
    db.commit()
    db.refresh(profile)

    return {
        "status": "success",
        "profile": {
            "code": profile.code,
            "name": profile.name,
            "grace_window_minutes": profile.grace_window_minutes,
            "escalation_level_1_mins": profile.escalation_level_1_mins,
            "escalation_level_2_mins": profile.escalation_level_2_mins,
            "timezone": profile.timezone,
        }
    }
