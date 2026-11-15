import pytest
from fastapi.testclient import TestClient


def test_get_today_care_tasks_summary(client: TestClient, elder_headers: dict):
    """Test retrieving the 1-month routine care tasks schedule for today."""
    res = client.get("/api/tasks/today", headers=elder_headers)
    assert res.status_code == 200
    data = res.json()
    assert "today_date" in data
    assert "total_tasks" in data
    assert "completed_tasks" in data
    assert "tasks" in data
    assert isinstance(data["tasks"], list)


def test_create_and_complete_care_task(client: TestClient, caretaker_headers: dict):
    """Test scheduling a daily hydration/exercise task and verifying confirmation."""
    task_payload = {
        "title": "Morning 15-minute garden walk",
        "description": "Gentle stretching and mobility walk with cane",
        "category": "EXERCISE",
        "scheduled_time": "08:30",
        "duration_days": 30,
        "days_of_week": [0, 1, 2, 3, 4, 5, 6],
        "persistent_alert": True,
    }
    create_res = client.post("/api/tasks", json=task_payload, headers=caretaker_headers)
    assert create_res.status_code == 201
    task = create_res.json()
    assert task["title"] == "Morning 15-minute garden walk"
    assert task["status"] == "success"
    assert task["duration_days"] == 30
