import pytest
from app.core.security import generate_action_token
from app.models.sos_event import SOSEvent


def test_trigger_sos_and_broadcast(client, elder_headers, db):
    """Feature 1: Verify triggering SOS creates OPEN event and returns confirmation."""
    res = client.post(
        "/api/sos",
        json={"latitude": 19.0760, "longitude": 72.8777, "notes": "Felt dizzy in bedroom"},
        headers=elder_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "sos_active"
    assert "sos_id" in data
    assert data["elder_name"] == "Ramesh Patel"

    sos_id = data["sos_id"]

    # Verify active SOS endpoint returns event for dashboard banner
    banner_res = client.get("/api/sos/active", headers=elder_headers)
    assert banner_res.status_code == 200
    active = banner_res.json()
    assert active["id"] == sos_id
    assert active["status"] == "OPEN"

    # Clean up resolve
    client.post(f"/api/sos/{sos_id}/resolve", headers=elder_headers)


def test_magic_link_sos_acknowledge_without_login(client, db):
    """Feature 1: Verify signed magic link acknowledges SOS without requiring password login."""
    # Create test SOS event
    sos = SOSEvent(
        profile_id=1,
        triggered_by="Ramesh Patel (ELDER)",
        status="OPEN",
        incident_type="GENERAL_SOS",
    )
    db.add(sos)
    db.commit()

    from app.models.member import Member
    caretaker = db.query(Member).filter(Member.role == "CARETAKER").first()
    token = generate_action_token(sos_event_id=sos.id, action="ACK_SOS", member_id=caretaker.id)

    # Magic link execution requires no auth header
    res = client.get(f"/api/actions/execute/{token}")
    assert res.status_code == 200

    # Verify status changed to ACK in database
    db.expire_all()
    updated_sos = db.query(SOSEvent).filter(SOSEvent.id == sos.id).first()
    assert updated_sos.status == "ACK"
    assert "Priya" in updated_sos.acknowledged_by


def test_medication_emergency_incident(client, elder_headers):
    """Verify medication overdose/incident triggers high-priority alert and creates incident SOS."""
    res = client.post(
        "/api/emergency/medication-incident",
        json={
            "incident_type": "OVERDOSE",
            "medication_name": "Metformin",
            "dosage": "500mg",
            "symptoms": ["Dizziness", "Excessive sweating"],
            "notes": "Accidentally took morning dose twice",
            "latitude": 19.076,
            "longitude": 72.877,
        },
        headers=elder_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "Medication Emergency SOS" in data["message"]

    # Clean up resolve
    banner = client.get("/api/sos/active", headers=elder_headers).json()
    if banner:
        client.post(f"/api/sos/{banner['id']}/resolve", headers=elder_headers)
