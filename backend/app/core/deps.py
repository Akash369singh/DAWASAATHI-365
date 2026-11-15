from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.member import Member
from app.models.profile import Profile

security_scheme = HTTPBearer(auto_error=False)


def get_current_member(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> Member:
    """Extract and validate the currently authenticated DawaSaathi 365 member."""
    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(auth.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    member_id = int(payload["sub"])
    member = db.query(Member).filter(Member.id == member_id, Member.is_active.is_(True)).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Member account no longer exists or is inactive",
        )
    return member


def get_current_profile(
    member: Member = Depends(get_current_member),
    db: Session = Depends(get_db),
) -> Profile:
    """Fetch the active Profile associated with the authenticated member."""
    profile = db.query(Profile).filter(Profile.id == member.profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Care profile not found",
        )
    return profile


class RoleChecker:
    """Enforces role-based permissions (e.g. ELDER and CARETAKER only)."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, member: Member = Depends(get_current_member)) -> Member:
        if member.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(self.allowed_roles)} (current: {member.role})",
            )
        return member
