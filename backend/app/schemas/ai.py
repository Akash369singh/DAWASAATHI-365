from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PrescriptionItem(BaseModel):
    name: str
    dosage: str
    form: str = "Tablet"
    instructions: str = "After food"
    times_per_day: int = 1
    schedule_times: List[str] = ["08:00"]
    days_of_week: List[int] = [0, 1, 2, 3, 4, 5, 6]
    stock_count: int = 30
    duration_days: Optional[int] = 30
    notes: Optional[str] = None


class PrescriptionScanResponse(BaseModel):
    success: bool
    doctor_name: Optional[str] = None
    clinic_or_hospital: Optional[str] = None
    date: Optional[str] = None
    extracted_medications: List[PrescriptionItem] = []
    clinical_instructions: Optional[str] = None
    ai_assisted_notice: str = "AI-assisted extraction, please review and verify before saving."


class NLParseRequest(BaseModel):
    text: str = Field(..., min_length=2, description="Natural language voice transcript or typed text in Hinglish/Hindi/English")
    target_type: Optional[str] = Field("AUTO", pattern="^(AUTO|MEDICATION|APPOINTMENT)$")


class NLParseResponse(BaseModel):
    success: bool
    detected_type: str  # MEDICATION, APPOINTMENT, UNKNOWN
    confidence: float
    parsed_data: Dict[str, Any]
    explanation: str
    ai_assisted_notice: str = "AI-assisted parsed entry, please confirm before saving."


class AIInsightResponse(BaseModel):
    adherence_rate_30d: float
    plain_language_summary: str
    patterns_identified: List[str] = []
    celebration_points: List[str] = []
    gentle_nudges: List[str] = []
    doctor_visit_brief: Dict[str, Any]
    ai_assisted_notice: str = "AI summaries are for informational purposes only and do not constitute medical diagnosis or advice."


class VoiceChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: Optional[List[Dict[str, str]]] = []


class VoiceChatResponse(BaseModel):
    reply: str
    speech_text: str
    detected_intent: Optional[str] = None
    action_data: Optional[Dict[str, Any]] = None


class MedicineEncyclopediaRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Medicine name, brand, active salt, or condition")


class MedicineEncyclopediaResponse(BaseModel):
    success: bool
    name: str
    brand_names: List[str] = []
    generic_name: str
    drug_class: str
    kisko_khana_chahiye: str
    kisko_nahi_khana_chahiye: Optional[str] = None
    how_to_take: str
    when_to_take: str
    elderly_care_precautions: str
    common_side_effects: List[str] = []
    severe_warning_signs: List[str] = []
    food_and_drug_interactions: List[str] = []
    missed_dose_advice: str
    storage_guidance: str
    detected_from_image: Optional[bool] = False
    image_identification_confidence: Optional[str] = None
    disclaimer: str = (
        "Medical educational reference compiled by DawaSaathi AI & pharmacopeia data. "
        "Always consult a qualified doctor or pharmacist before starting or modifying dosages."
    )

