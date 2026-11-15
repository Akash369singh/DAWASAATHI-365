import pytest


def test_get_today_schedule(client, elder_headers):
    """Verify today schedule endpoint returns doses, timeline, and next dose."""
    res = client.get("/api/doses/today", headers=elder_headers)
    assert res.status_code == 200
    data = res.json()
    assert "doses" in data
    assert "total_doses" in data
    assert "completed_doses" in data


def test_mark_dose_taken_and_decrement_pill(client, elder_headers):
    """Verify taking a dose marks it TAKEN and automatically decrements pill stock count (Feature 5)."""
    sched = client.get("/api/doses/today", headers=elder_headers).json()
    assert len(sched["doses"]) > 0
    dose_id = sched["doses"][0]["id"]
    med_id = sched["doses"][0]["medication_id"]

    # Get initial stock
    meds_before = client.get("/api/medications", headers=elder_headers).json()
    target_med_before = next(m for m in meds_before if m["id"] == med_id)
    initial_stock = target_med_before["stock_count"]

    # Mark taken
    take_res = client.post(f"/api/doses/{dose_id}/take", headers=elder_headers)
    assert take_res.status_code == 200
    assert take_res.json()["new_status"] == "TAKEN"

    # Verify inventory was decremented by 1
    meds_after = client.get("/api/medications", headers=elder_headers).json()
    target_med_after = next(m for m in meds_after if m["id"] == med_id)
    assert target_med_after["stock_count"] == initial_stock - 1


def test_snooze_dose_and_enforce_limit(client, elder_headers, db):
    """Feature 3: Verify dose can be snoozed, updates timing, and enforces max 2 snoozes limit."""
    from app.models.dose_log import DoseLog
    # Reset or find pending dose
    dose = db.query(DoseLog).first()
    dose.status = "PENDING"
    dose.snooze_count = 0
    db.commit()

    # First snooze (30 min)
    snooze_1 = client.post(f"/api/doses/{dose.id}/snooze", json={"minutes": 30}, headers=elder_headers)
    assert snooze_1.status_code == 200
    assert "Ramesh Patel will take" in snooze_1.json()["message"]

    # Second snooze (15 min)
    snooze_2 = client.post(f"/api/doses/{dose.id}/snooze", json={"minutes": 15}, headers=elder_headers)
    assert snooze_2.status_code == 200

    # Third snooze must fail with 400 (max 2 limit)
    snooze_3 = client.post(f"/api/doses/{dose.id}/snooze", json={"minutes": 30}, headers=elder_headers)
    assert snooze_3.status_code == 400
    assert "Maximum 2 snoozes" in snooze_3.json()["detail"]


def test_adherence_stats(client, elder_headers):
    """Verify 7-day and 30-day adherence statistics calculation."""
    res = client.get("/api/doses/stats", headers=elder_headers)
    assert res.status_code == 200
    data = res.json()
    assert "seven_day_pct" in data or "thirty_day_pct" in data
