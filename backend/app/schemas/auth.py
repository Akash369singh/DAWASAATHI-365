from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    profile_code: str = Field(..., description="Unique DawaSaathi 365 profile code, e.g. CARE-7291")
    passcode: str = Field(..., description="4-6 digit or text passcode")


class ProfileCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    elder_name: str = Field(..., min_length=2, max_length=100)
    elder_age: int = Field(..., ge=1, le=130)
    timezone: str = Field(default="Asia/Kolkata")
    creator_name: str = Field(..., min_length=2, max_length=100)
    creator_email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    creator_phone: Optional[str] = None
    creator_role: str = Field(default="CARETAKER", pattern="^(ELDER|CARETAKER)$")
    passcode: str = Field(..., min_length=4, max_length=20)


class MemberInviteRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    phone: Optional[str] = None
    role: str = Field(..., pattern="^(ELDER|CARETAKER|FAMILY)$")
    passcode: str = Field(..., min_length=4, max_length=20)
    permissions: Optional[Dict[str, Any]] = None


class ProfileSettingsUpdate(BaseModel):
    name: Optional[str] = None
    grace_window_minutes: Optional[int] = Field(None, ge=5, le=180)
    escalation_level_1_mins: Optional[int] = Field(None, ge=5, le=120)
    escalation_level_2_mins: Optional[int] = Field(None, ge=5, le=180)
    timezone: Optional[str] = None


class MemberPermissionUpdate(BaseModel):
    can_edit_meds: Optional[bool] = None
    view_all_meds: Optional[bool] = None
    view_appointments: Optional[bool] = None
    receive_missed_alerts: Optional[bool] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    member_id: int
    member_name: str
    role: str
    profile_id: int
    profile_code: str
    elder_name: str
    elder_age: int
    timezone: str
    permissions: Dict[str, Any]
