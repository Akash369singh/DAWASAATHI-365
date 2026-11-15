from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, Medication, AuditLog
from app.schemas.medication import MedicationCreate, MedicationUpdate, MedicationOut
from app.core.deps import get_current_member, get_current_profile
from app.services.scheduler_service import generate_missing_dose_logs

router = APIRouter(prefix="/api/medications", tags=["Medications"])


def check_med_edit_permission(member: Member):
    """Ensure member has permission to modify medications."""
    if member.role in ["ELDER", "CARETAKER"]:
        return True
    perms = member.permissions or {}
    if perms.get("can_edit_meds", False):
        return True
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to modify medication schedules. Ask the elder to grant edit rights.",
    )


@router.get("", response_model=List[MedicationOut])
def list_medications(
    active_only: bool = True,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve all medications for this DawaSaathi 365 profile."""
    query = db.query(Medication).filter(Medication.profile_id == profile.id)
    if active_only:
        query = query.filter(Medication.is_active.is_(True))
    return query.order_by(Medication.name.asc()).all()


@router.post("", response_model=MedicationOut, status_code=status.HTTP_201_CREATED)
def create_medication(
    payload: MedicationCreate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Add a new medication to the DawaSaathi 365 schedule."""
    check_med_edit_permission(member)

    med = Medication(
        profile_id=profile.id,
        name=payload.name,
        dosage=payload.dosage,
        form=payload.form,
        instructions=payload.instructions,
        times_per_day=payload.times_per_day,
        schedule_times=payload.schedule_times,
        days_of_week=payload.days_of_week,
        start_date=payload.start_date,
        end_date=payload.end_date,
        notes=payload.notes,
        stock_count=payload.stock_count,
        refill_alert_threshold=payload.refill_alert_threshold,
        is_active=payload.is_active,
    )
    db.add(med)
    db.flush()

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="MEDICATION_CREATED",
        details={"name": med.name, "dosage": med.dosage, "schedule_times": med.schedule_times},
    ))
    db.commit()
    db.refresh(med)

    # Immediately ensure dose logs are generated for today/tomorrow
    generate_missing_dose_logs(db, target_days_ahead=1)

    return med


@router.put("/{med_id}", response_model=MedicationOut)
def update_medication(
    med_id: int,
    payload: MedicationUpdate,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Update an existing medication schedule."""
    check_med_edit_permission(member)

    med = db.query(Medication).filter(Medication.id == med_id, Medication.profile_id == profile.id).first()
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(med, field, value)

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="MEDICATION_UPDATED",
        details={"med_id": med.id, "name": med.name, "updated_fields": list(update_data.keys())},
    ))
    db.commit()
    db.refresh(med)

    # Re-generate dose logs if schedule times changed
    generate_missing_dose_logs(db, target_days_ahead=1)

    return med


@router.delete("/{med_id}")
def delete_medication(
    med_id: int,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Deactivate or remove a medication from the active regimen."""
    check_med_edit_permission(member)

    med = db.query(Medication).filter(Medication.id == med_id, Medication.profile_id == profile.id).first()
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    med_name = med.name
    med.is_active = False  # Soft delete
    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="MEDICATION_DEACTIVATED",
        details={"med_id": med.id, "name": med_name},
    ))
    db.commit()

    return {"status": "success", "message": f"{med_name} removed from active regimen"}


@router.patch("/{med_id}/refill")
@router.post("/{med_id}/refill")
def refill_medication_stock(
    med_id: int,
    add_count: int = 30,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Add pill units to the inventory stock count."""
    med = db.query(Medication).filter(Medication.id == med_id, Medication.profile_id == profile.id).first()
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found")

    med.stock_count += add_count
    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="STOCK_REFILLED",
        details={"med_id": med.id, "name": med.name, "added": add_count, "new_total": med.stock_count},
    ))
    db.commit()
    return {"status": "success", "stock_count": med.stock_count, "name": med.name}
