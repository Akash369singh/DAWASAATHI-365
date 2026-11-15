import pytest
from fastapi.testclient import TestClient


def test_list_care_circle_members(client: TestClient, elder_headers: dict):
    """Test retrieving all authorized members of the family care circle."""
    res = client.get("/api/care-circle/members", headers=elder_headers)
    assert res.status_code == 200
    members = res.json()
    assert isinstance(members, list)
    assert len(members) >= 2
    names = [m["name"] for m in members]
    assert "Ramesh Patel" in names
    assert "Priya Patel" in names


def test_create_and_list_health_vitals(client: TestClient, caretaker_headers: dict):
    """Test recording a blood pressure reading and querying the vitals log."""
    payload = {
        "vital_type": "BLOOD_PRESSURE",
        "value_numeric": 120.0,
        "value_secondary": 80.0,
        "unit": "mmHg",
        "context": "Morning baseline check",
        "notes": "Resting seated position",
    }
    create_res = client.post("/api/vitals", json=payload, headers=caretaker_headers)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["vital_type"] == "BLOOD_PRESSURE"
    assert created["value_numeric"] == 120.0
    assert created["value_secondary"] == 80.0

    # Query list
    list_res = client.get("/api/vitals?vital_type=BLOOD_PRESSURE", headers=caretaker_headers)
    assert list_res.status_code == 200
    vitals = list_res.json()
    assert len(vitals) >= 1
    assert vitals[0]["vital_type"] == "BLOOD_PRESSURE"
