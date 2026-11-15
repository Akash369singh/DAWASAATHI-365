from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Profile, Member, AuditLog
from app.schemas.auth import MemberInviteRequest, MemberPermissionUpdate
from app.core.security import hash_passcode
from app.core.deps import get_current_member, get_current_profile, RoleChecker

router = APIRouter(prefix="/api/care-circle", tags=["Family Care Circle & Privacy"])


@router.get("/members")
def list_circle_members(
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """List all authorized circle members, their assigned roles, and privacy permissions."""
    members = db.query(Member).filter(Member.profile_id == profile.id, Member.is_active.is_(True)).all()
    
    output = []
    for m in members:
        output.append({
            "id": m.id,
            "name": m.name,
            "email": m.email,
            "phone": m.phone,
            "role": m.role,
            "permissions": m.permissions or {},
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })
    return output


@router.post("/invite", status_code=status.HTTP_201_CREATED)
def invite_member(
    payload: MemberInviteRequest,
    member: Member = Depends(RoleChecker(["ELDER", "CARETAKER"])),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Invite a new family or caretaker member and set initial permissions."""
    existing = db.query(Member).filter(
        Member.profile_id == profile.id,
        Member.email == payload.email,
        Member.is_active.is_(True),
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A member with this email already exists in your family circle",
        )

    default_perms = {
        "can_edit_meds": payload.role in ["ELDER", "CARETAKER"],
        "view_all_meds": True,
        "view_appointments": True,
        "receive_missed_alerts": True,
    }
    if payload.permissions:
        default_perms.update(payload.permissions)

    new_member = Member(
        profile_id=profile.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        role=payload.role,
        passcode_hash=hash_passcode(payload.passcode),
        permissions=default_perms,
    )
    db.add(new_member)
    db.flush()

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="MEMBER_INVITED",
        details={"invited_name": new_member.name, "role": new_member.role, "email": new_member.email},
    ))
    db.commit()

    return {
        "status": "success",
        "message": f"Member {new_member.name} invited successfully.",
        "member": {
            "id": new_member.id,
            "name": new_member.name,
            "email": new_member.email,
            "role": new_member.role,
            "passcode": payload.passcode,  # Displayed once on invite for the organizer to share
            "permissions": new_member.permissions,
        },
    }


@router.patch("/members/{member_id}/permissions")
def update_member_permissions(
    member_id: int,
    payload: MemberPermissionUpdate,
    member: Member = Depends(RoleChecker(["ELDER", "CARETAKER"])),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Elder-controlled privacy: update what a family member is authorized to view or edit."""
    target = db.query(Member).filter(
        Member.id == member_id,
        Member.profile_id == profile.id,
        Member.is_active.is_(True),
    ).first()

    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    perms = dict(target.permissions or {})
    update_dict = payload.model_dump(exclude_unset=True)
    perms.update(update_dict)
    target.permissions = perms

    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="PERMISSIONS_UPDATED",
        details={"target_member": target.name, "updated_permissions": update_dict},
    ))
    db.commit()

    return {
        "status": "success",
        "member_id": target.id,
        "name": target.name,
        "permissions": target.permissions,
    }


@router.get("/audit-log")
def get_audit_log(
    limit: int = 50,
    member: Member = Depends(get_current_member),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Retrieve the transparency audit trail ('who viewed/changed what')."""
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.profile_id == profile.id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": log.id,
            "actor_name": log.actor_name,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


@router.delete("/members/{member_id}")
def remove_member(
    member_id: int,
    member: Member = Depends(RoleChecker(["ELDER", "CARETAKER"])),
    profile: Profile = Depends(get_current_profile),
    db: Session = Depends(get_db),
):
    """Revoke a member's access from this family circle."""
    if member_id == member.id:
        raise HTTPException(status_code=400, detail="Cannot remove your own account from the family circle")

    target = db.query(Member).filter(
        Member.id == member_id,
        Member.profile_id == profile.id,
    ).first()

    if not target:
        raise HTTPException(status_code=404, detail="Member not found")

    target.is_active = False
    db.add(AuditLog(
        profile_id=profile.id,
        member_id=member.id,
        actor_name=member.name,
        action="MEMBER_REMOVED",
        details={"removed_name": target.name, "role": target.role},
    ))
    db.commit()

    return {"status": "success", "message": f"Access revoked for {target.name}"}
