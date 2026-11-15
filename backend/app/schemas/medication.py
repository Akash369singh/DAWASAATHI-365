from typing import List, Optional
from datetime import date, datetime
from pydantic import BaseModel, Field


class MedicationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    dosage: str = Field(..., min_length=1, max_length=60)
    form: str = Field(default="Tablet", max_length=40)
    instructions: Optional[str] = Field(None, max_length=200)
    times_per_day: int = Field(default=1, ge=1, le=12)
    schedule_times: List[str] = Field(default_factory=list, description="List of HH:MM strings in local time")
    days_of_week: List[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6], description="0=Mon, 6=Sun")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    stock_count: int = Field(default=30, ge=0)
    refill_alert_threshold: int = Field(default=7, ge=0)
    is_active: bool = True


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    form: Optional[str] = None
    instructions: Optional[str] = None
    times_per_day: Optional[int] = None
    schedule_times: Optional[List[str]] = None
    days_of_week: Optional[List[int]] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    stock_count: Optional[int] = None
    refill_alert_threshold: Optional[int] = None
    is_active: Optional[bool] = None


class MedicationOut(MedicationBase):
    id: int
    profile_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
