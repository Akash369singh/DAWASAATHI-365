from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class VitalCreate(BaseModel):
    vital_type: str = Field(..., pattern="^(BLOOD_PRESSURE|BLOOD_GLUCOSE|OXYGEN_SPO2|HEART_RATE|WEIGHT)$")
    value_numeric: float = Field(..., gt=0)
    value_secondary: Optional[float] = None
    unit: str = Field(..., max_length=20)
    context: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None


class VitalOut(BaseModel):
    id: int
    profile_id: int
    vital_type: str
    value_numeric: float
    value_secondary: Optional[float] = None
    unit: str
    context: Optional[str] = None
    notes: Optional[str] = None
    recorded_at: datetime
    recorded_at_local: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
