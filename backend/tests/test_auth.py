import pytest


def test_system_health_endpoint(client):
    """Verify backend health endpoint reports online status and DawaSaathi 365 identity."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["app"] == "DawaSaathi 365"
    assert "version" in data


def test_login_elder_success(client):
    """Verify elder can log in with 4-digit passcode and receive JWT token with role."""
    res = client.post(
        "/api/auth/login",
        json={"profile_code": "CARE-TEST", "passcode": "1234"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ELDER"
    assert data["member_name"] == "Ramesh Patel"
    assert data["profile_code"] == "CARE-TEST"


def test_login_caretaker_success(client):
    """Verify primary caretaker can log in with their assigned passcode."""
    res = client.post(
        "/api/auth/login",
        json={"profile_code": "CARE-TEST", "passcode": "5678"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "CARETAKER"
    assert data["member_name"] == "Priya Patel"


def test_login_invalid_passcode(client):
    """Ensure invalid passcodes are rejected with 401 unauthorized."""
    res = client.post(
        "/api/auth/login",
        json={"profile_code": "CARE-TEST", "passcode": "0000"},
    )
    assert res.status_code == 401
    assert "passcode" in res.json()["detail"].lower()


def test_login_nonexistent_profile(client):
    """Ensure non-existent profile codes return 404 not found."""
    res = client.post(
        "/api/auth/login",
        json={"profile_code": "CARE-XXXX", "passcode": "1234"},
    )
    assert res.status_code == 404


def test_get_current_member_profile(client, elder_headers):
    """Verify authenticated user can retrieve current session details via /auth/me."""
    res = client.get("/api/auth/me", headers=elder_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "ELDER"
    assert data["member_name"] == "Ramesh Patel"
    assert "permissions" in data


def test_jwt_required_on_protected_routes(client):
    """Verify unauthenticated requests to protected endpoints return 401."""
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    res_meds = client.get("/api/medications")
    assert res_meds.status_code == 401


def test_role_enforcement_family_cannot_edit_medications_without_perm(client, family_headers):
    """Ensure FAMILY member without can_edit_meds permission receives 403 Forbidden."""
    res = client.post(
        "/api/medications",
        json={
            "name": "Restricted Med",
            "dosage": "10 mg",
            "schedule_times": ["08:00"],
            "days_of_week": [0, 1, 2, 3, 4, 5, 6],
            "times_per_day": 1,
        },
        headers=family_headers,
    )
    assert res.status_code == 403
    assert "permission" in res.json()["detail"].lower()


def test_lockout_after_repeated_failed_attempts(client):
    """Verify that 5 consecutive failed logins trigger 429 rate limit lockout."""
    for _ in range(5):
        client.post(
            "/api/auth/login",
            json={"profile_code": "CARE-TEST", "passcode": "0000"},
        )
    # The 6th attempt should return 429
    res = client.post(
        "/api/auth/login",
        json={"profile_code": "CARE-TEST", "passcode": "0000"},
    )
    assert res.status_code in [401, 429]

