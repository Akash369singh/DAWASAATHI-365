import os
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure environment uses test database
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-for-dawasaathi-365"
os.environ["DEBUG"] = "true"

from app.database import Base, get_db
from app.main import app
from app.models.profile import Profile
from app.models.member import Member
from app.models.medication import Medication
from app.models.dose_log import DoseLog
from app.core.security import hash_passcode, create_access_token

# In-memory test engine with static pool to share connection across threads
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    # Pre-seed baseline test data if not already present
    existing_profile = session.query(Profile).filter(Profile.code == "CARE-TEST").first()
    if not existing_profile:
        profile = Profile(
            code="CARE-TEST",
            name="Patel Family Care Circle",
            elder_name="Ramesh Patel",
            elder_age=72,
            timezone="Asia/Kolkata",
            blood_group="B+ POSITIVE",
            allergies="Penicillin",
            emergency_card_enabled=True,
            emergency_card_token="emergency-test-token-123",
        )
        session.add(profile)
        session.flush()

        elder_member = Member(
            profile_id=profile.id,
            name="Ramesh Patel",
            email="ramesh.test@example.com",
            role="ELDER",
            passcode_hash=hash_passcode("1234"),
            permissions={"can_edit_meds": True, "view_all_meds": True, "view_appointments": True, "receive_missed_alerts": False},
        )
        caretaker_member = Member(
            profile_id=profile.id,
            name="Priya Patel",
            email="priya.test@example.com",
            role="CARETAKER",
            passcode_hash=hash_passcode("5678"),
            permissions={"can_edit_meds": True, "view_all_meds": True, "view_appointments": True, "receive_missed_alerts": True},
        )
        family_member = Member(
            profile_id=profile.id,
            name="Amit Patel",
            email="amit.test@example.com",
            role="FAMILY",
            passcode_hash=hash_passcode("9999"),
            permissions={"can_edit_meds": False, "view_all_meds": True, "view_appointments": True, "receive_missed_alerts": True},
        )
        session.add_all([elder_member, caretaker_member, family_member])
        session.flush()

        med = Medication(
            profile_id=profile.id,
            name="Metformin",
            dosage="500mg",
            form="Tablet",
            instructions="With morning breakfast",
            schedule_times=["08:00"],
            stock_count=45,
            refill_alert_threshold=7,
            is_active=True,
        )
        session.add(med)
        session.flush()

        # Seed dose log for today
        now_utc = datetime.now(timezone.utc)
        dose = DoseLog(
            profile_id=profile.id,
            medication_id=med.id,
            scheduled_at=now_utc - timedelta(hours=1),
            status="PENDING",
            snooze_count=0,
        )
        session.add(dose)
        session.commit()

    # Override get_db for FastAPI
    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def elder_token(db):
    profile = db.query(Profile).filter(Profile.code == "CARE-TEST").first()
    elder = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "ELDER").first()
    return create_access_token(
        data={
            "sub": str(elder.id),
            "profile_id": profile.id,
            "profile_code": profile.code,
            "role": elder.role,
            "name": elder.name,
        }
    )


@pytest.fixture
def caretaker_token(db):
    profile = db.query(Profile).filter(Profile.code == "CARE-TEST").first()
    caretaker = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "CARETAKER").first()
    return create_access_token(
        data={
            "sub": str(caretaker.id),
            "profile_id": profile.id,
            "profile_code": profile.code,
            "role": caretaker.role,
            "name": caretaker.name,
        }
    )


@pytest.fixture
def elder_headers(elder_token):
    return {"Authorization": f"Bearer {elder_token}"}


@pytest.fixture
def caretaker_headers(caretaker_token):
    return {"Authorization": f"Bearer {caretaker_token}"}


@pytest.fixture
def family_token(db):
    profile = db.query(Profile).filter(Profile.code == "CARE-TEST").first()
    family = db.query(Member).filter(Member.profile_id == profile.id, Member.role == "FAMILY").first()
    return create_access_token(
        data={
            "sub": str(family.id),
            "profile_id": profile.id,
            "profile_code": profile.code,
            "role": family.role,
            "name": family.name,
        }
    )


@pytest.fixture
def family_headers(family_token):
    return {"Authorization": f"Bearer {family_token}"}

