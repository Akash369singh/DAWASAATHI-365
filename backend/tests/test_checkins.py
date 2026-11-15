import pytest
from app.core.security import generate_action_token


def test_submit_daily_checkin(client, elder_headers):
    """Feature 4: Verify elder can submit daily check-in (GOOD / OKAY / NOT_WELL)."""
    res = client.post(
        "/api/checkins",
        json={"mood": "GOOD", "note": "Morning walk completed, feeling energized"},
        headers=elder_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["mood"] == "GOOD"
    assert "Morning walk" in data["note"]


def test_daily_checkin_history(client, elder_headers):
    """Feature 4: Verify 14-day wellbeing strip data retrieval."""
    client.post(
        "/api/checkins",
        json={"mood": "GOOD", "note": "Morning checkin for history test"},
        headers=elder_headers,
    )
    res = client.get("/api/checkins/history?days=14", headers=elder_headers)
    assert res.status_code == 200
    history = res.json()
    assert isinstance(history, list)
    assert len(history) >= 1
    assert any(c["mood"] == "GOOD" for c in history)


def test_magic_link_checkin_action(client):
    """Feature 4: Verify clicking email checkin button records mood via signed magic link without login."""
    token = generate_action_token(
        action="CHECKIN",
        member_id=1,
        extra={"mood": "GOOD", "source": "email_button"},
    )
    res = client.get(f"/api/actions/execute/{token}")
    assert res.status_code == 200
    assert "Recorded" in res.text or "Thank you" in res.text or "DawaSaathi" in res.text
