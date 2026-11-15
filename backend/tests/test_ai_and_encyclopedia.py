import pytest


def test_medicine_encyclopedia_lookup(client, elder_headers):
    """Verify omni-medicine encyclopedia returns clinical details for Paracetamol / Dolo."""
    res = client.post(
        "/api/ai/medicine-info",
        json={"query": "Paracetamol"},
        headers=elder_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "Paracetamol" in data["name"]
    assert "Analgesic" in data["drug_class"]
    assert data["kisko_khana_chahiye"] is not None
    assert data["elderly_care_precautions"] is not None
    assert len(data["common_side_effects"]) > 0


def test_natural_language_voice_parsing(client, elder_headers):
    """Verify AI natural language schedule parser parses Hinglish text into dosage schedule."""
    res = client.post(
        "/api/ai/parse-nl",
        json={"text": "Roz subah khane ke baad ek goli Metformin 500mg leni hai"},
        headers=elder_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "parsed_data" in data or "name" in data
