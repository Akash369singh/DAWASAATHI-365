from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from app.config import settings

# Serializer for passwordless magic action links
action_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt="carecircle-magic-action")


def hash_passcode(passcode: str) -> str:
    """Hash a numeric or alphanumeric passcode using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(passcode.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_passcode(plain_passcode: str, hashed_passcode: str) -> bool:
    """Verify a plain passcode against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_passcode.encode("utf-8"),
            hashed_passcode.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token containing member details and role."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def generate_action_token(
    dose_log_id: Optional[int] = None,
    action: str = "TAKE_DOSE",
    member_id: Optional[int] = None,
    sos_event_id: Optional[int] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> str:
    """Generate a signed single-use action token for email magic links."""
    payload = {
        "dose_log_id": dose_log_id,
        "sos_event_id": sos_event_id,
        "action": action,
        "member_id": member_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if extra:
        payload.update(extra)
    return action_serializer.dumps(payload)


def verify_action_token(token: str, max_age_seconds: int = 86400 * 2) -> Optional[Dict[str, Any]]:
    """Verify and decode a signed single-use action token."""
    try:
        payload = action_serializer.loads(token, max_age=max_age_seconds)
        return payload
    except (SignatureExpired, BadSignature):
        return None
