import pytest


def test_get_emergency_card_settings(client, elder_headers):
    """Feature 2: Verify retrieving emergency card configuration."""
    res = client.get("/api/emergency-card/settings", headers=elder_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["is_enabled"] is True
    assert "token" in data
    assert "exposed_fields" in data


def test_public_emergency_card_view(client, elder_headers):
    """Feature 2: Verify public unguessable /e/{token} view returns patient emergency data without login."""
    settings_res = client.get("/api/emergency-card/settings", headers=elder_headers).json()
    token = settings_res["token"]

    # Public view does not pass auth headers
    res = client.get(f"/api/emergency-card/public/{token}")
    assert res.status_code == 200
    data = res.json()
    assert "patient" in data
    assert data["patient"]["name"] == "Ramesh Patel"
    assert "emergency_contacts" in data


def test_regenerate_emergency_card_token(client, elder_headers):
    """Feature 2: Verify regenerating token revokes the old public URL and generates a fresh token."""
    old_token = client.get("/api/emergency-card/settings", headers=elder_headers).json()["token"]

    regen_res = client.post("/api/emergency-card/regenerate-token", headers=elder_headers)
    assert regen_res.status_code == 200
    new_token = regen_res.json()["token"]
    assert new_token != old_token

    # Old token must now return 404
    old_view = client.get(f"/api/emergency-card/public/{old_token}")
    assert old_view.status_code == 404
