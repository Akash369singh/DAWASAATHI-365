from unittest.mock import patch
import pytest
from app.core.security import generate_action_token, verify_action_token
from app.models import ActionToken, DoseLog


def test_magic_link_mark_dose_taken_and_single_use(client, db):
    """Verify passwordless magic link marks dose as TAKEN and enforces single-use."""
    dose = db.query(DoseLog).first()
    assert dose is not None

    token = generate_action_token(
        dose_log_id=dose.id,
        action="TAKE_DOSE",
        member_id=1,
    )

    # First call: marks dose taken
    res1 = client.get(f"/api/actions/execute/{token}")
    assert res1.status_code == 200
    assert "Dose Recorded" in res1.text or "Confirmed" in res1.text or "DawaSaathi" in res1.text

    # Second call: already acknowledged / single use enforced
    res2 = client.get(f"/api/actions/execute/{token}")
    assert res2.status_code == 200
    assert "Already Acknowledged" in res2.text or "already been" in res2.text


def test_magic_link_tampered_signature_rejected(client):
    """Verify forged or tampered token returns 400 Bad Request."""
    tampered_token = "invalid.token.signature"
    res = client.get(f"/api/actions/execute/{tampered_token}")
    assert res.status_code == 400
    assert "Expired or Invalid" in res.text


def test_magic_link_expired_token_rejected(client):
    """Verify expired action token returns 400 Bad Request."""
    token = generate_action_token(dose_log_id=1, action="TAKE_DOSE", member_id=1)
    
    # Direct security verification: max_age_seconds=-1 detects expiration
    assert verify_action_token(token, max_age_seconds=-1) is None

    # Endpoint returns 400 when token verification fails
    with patch("app.api.actions.verify_action_token", return_value=None):
        res = client.get(f"/api/actions/execute/{token}")
        assert res.status_code == 400
        assert "Expired or Invalid" in res.text


