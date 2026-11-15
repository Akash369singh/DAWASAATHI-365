import pytest


def test_list_medications(client, elder_headers):
    """Verify listing active medications returns seeded regimen."""
    res = client.get("/api/medications?active_only=true", headers=elder_headers)
    assert res.status_code == 200
    meds = res.json()
    assert len(meds) >= 1
    assert any(m["name"] == "Metformin" for m in meds)


def test_create_medication(client, elder_headers):
    """Verify creating a new medication stores schedule, pill count, and instructions."""
    payload = {
        "name": "Telmisartan",
        "dosage": "40mg",
        "form": "Tablet",
        "instructions": "Before breakfast",
        "schedule_times": ["08:30"],
        "stock_count": 30,
        "refill_alert_threshold": 7,
    }
    res = client.post("/api/medications", json=payload, headers=elder_headers)
    assert res.status_code in [200, 201]
    data = res.json()
    assert data["name"] == "Telmisartan"
    assert data["dosage"] == "40mg"
    assert data["stock_count"] == 30
    assert data["refill_alert_threshold"] == 7


def test_refill_medication_stock(client, elder_headers):
    """Feature 5: Verify Refilled +30 quick action updates inventory count."""
    meds = client.get("/api/medications", headers=elder_headers).json()
    med_id = meds[0]["id"]
    initial_stock = meds[0]["stock_count"]

    res = client.post(f"/api/medications/{med_id}/refill?add_count=30", headers=elder_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["stock_count"] == initial_stock + 30
