from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AppointmentBase(BaseModel):
    doctor_name: str = Field(..., min_length=2, max_length=120)
    specialty: str = Field(default="General Physician", max_length=100)
    location: str = Field(..., min_length=2, max_length=255)
    scheduled_datetime: datetime
    notes: Optional[str] = None
    status: str = Field(default="SCHEDULED", pattern="^(SCHEDULED|COMPLETED|CANCELLED)$")


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    doctor_name: Optional[str] = None
    specialty: Optional[str] = None
    location: Optional[str] = None
    scheduled_datetime: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class AppointmentOut(AppointmentBase):
    id: int
    profile_id: int
    scheduled_datetime_local: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
