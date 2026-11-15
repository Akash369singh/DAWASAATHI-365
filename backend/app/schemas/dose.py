from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DoseActionRequest(BaseModel):
    action: Optional[str] = "TAKEN"
    notes: Optional[str] = None
    confirm_duplicate: Optional[bool] = False


class DoseSnoozeRequest(BaseModel):
    minutes: int = Field(default=30, ge=5, le=120)  # Choices: 15, 30, 60


class DoseLogOut(BaseModel):
    id: int
    profile_id: int
    medication_id: int
    medication_name: str
    dosage: str
    form: str
    instructions: Optional[str] = None
    scheduled_at: datetime
    scheduled_at_local: str
    status: str  # PENDING, TAKEN, MISSED, SKIPPED
    acted_at: Optional[datetime] = None
    acted_by_member_id: Optional[int] = None
    acted_by_name: Optional[str] = None
    escalation_level: int
    snoozed_until: Optional[datetime] = None
    snoozed_until_local: Optional[str] = None
    snooze_count: int = 0
    is_snoozed: bool = False
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TodayScheduleOut(BaseModel):
    today_date: str
    total_doses: int
    completed_doses: int
    pending_doses: int
    missed_doses: int
    adherence_pct: float
    next_dose: Optional[DoseLogOut] = None
    doses: List[DoseLogOut] = []
    status_summary: str


class DayAdherenceHeatmap(BaseModel):
    date: str  # YYYY-MM-DD
    total: int
    taken: int
    missed: int
    skipped: int
    adherence_pct: float
    level: int  # 0 to 4 intensity for GitHub-style heatmap


class AdherenceStatsOut(BaseModel):
    today_pct: float
    seven_day_pct: float
    thirty_day_pct: float
    total_scheduled_30d: int
    total_taken_30d: int
    total_missed_30d: int
    total_skipped_30d: int
    heatmap: List[DayAdherenceHeatmap] = []
