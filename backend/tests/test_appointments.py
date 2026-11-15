from datetime import datetime, timedelta, timezone
import pytest


def test_appointment_crud_and_upcoming(client, caretaker_headers):
    """Feature 5: Verify creating, reading, updating, and filtering upcoming doctor appointments."""
    future_time = datetime.now(timezone.utc) + timedelta(days=2)

    # 1. Create Appointment
    create_res = client.post(
        "/api/appointments",
        json={
            "doctor_name": "Dr. Shah",
            "specialty": "Cardiologist",
            "location": "Apollo Hospital, Room 204",
            "scheduled_datetime": future_time.isoformat(),
            "notes": "Bring previous blood pressure logs and ECG reports",
        },
        headers=caretaker_headers,
    )
    assert create_res.status_code in [200, 201]
    apt_id = create_res.json()["id"]
    assert create_res.json()["doctor_name"] == "Dr. Shah"

    # 2. List appointments with upcoming_only=True
    list_res = client.get("/api/appointments?upcoming_only=true", headers=caretaker_headers)
    assert list_res.status_code == 200
    apts = list_res.json()
    assert len(apts) >= 1
    assert any(a["id"] == apt_id for a in apts)

    # 3. Update Appointment
    update_res = client.put(
        f"/api/appointments/{apt_id}",
        json={"notes": "Updated: fasting required 8 hours prior"},
        headers=caretaker_headers,
    )
    assert update_res.status_code == 200
    assert "fasting required" in update_res.json()["notes"]

    # 4. Delete Appointment
    del_res = client.delete(f"/api/appointments/{apt_id}", headers=caretaker_headers)
    assert del_res.status_code in [200, 204]
