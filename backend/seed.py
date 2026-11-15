import os
import sys
from datetime import datetime, date, time, timedelta, timezone
import zoneinfo

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.config import settings
from app.core.security import hash_passcode
from app.models import (
    Profile,
    Member,
    Medication,
    DoseLog,
    Appointment,
    NotificationLog,
    AuditLog,
    HealthVital,
    CareTask,
    CareTaskLog,
    FamilyMessage,
)


def seed_database(db: Session = None) -> dict:
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # Check if demo profile already exists
        demo_code = "CARE-7291"
        existing_profile = db.query(Profile).filter(Profile.code == demo_code).first()
        if existing_profile:
            # Clean up existing demo profile to allow clean re-seeding
            db.delete(existing_profile)
            db.commit()

        local_tz = zoneinfo.ZoneInfo(settings.TIMEZONE)
        now_local = datetime.now(local_tz)
        today_date = now_local.date()

        # 1. Create Profile
        profile = Profile(
            code=demo_code,
            name="Ramesh Patel Care Circle",
            elder_name="Ramesh Patel",
            elder_age=72,
            timezone=settings.TIMEZONE,
            grace_window_minutes=45,
            escalation_level_1_mins=15,
            escalation_level_2_mins=30,
            # Feature 2: Emergency QR Card
            emergency_card_enabled=True,
            emergency_card_token="emergency-ramesh-7291-card",
            emergency_card_fields={
                "name": True,
                "blood_group": True,
                "allergies": True,
                "current_medicines": True,
                "doctor": True,
                "emergency_contacts": True,
            },
            blood_group="B+ POSITIVE",
            allergies="Penicillin, Sulfa drugs, Peanuts (Mild)",
            emergency_notes="Hypertension (controlled), Type-2 Diabetes. Uses reading glasses and walking stick.",
        )
        db.add(profile)
        db.flush()

        # 2. Create Members (Elder, Caretaker, Family)
        elder = Member(
            profile_id=profile.id,
            name="Ramesh Patel",
            email="ramesh@example.com",
            phone="+91 98765 43210",
            role="ELDER",
            passcode_hash=hash_passcode("1234"),
            permissions={
                "can_edit_meds": True,
                "view_all_meds": True,
                "view_appointments": True,
                "receive_missed_alerts": False,
            },
        )
        caretaker = Member(
            profile_id=profile.id,
            name="Priya Patel",
            email="priya.care@example.com",
            phone="+91 98765 43211",
            role="CARETAKER",
            passcode_hash=hash_passcode("5678"),
            permissions={
                "can_edit_meds": True,
                "view_all_meds": True,
                "view_appointments": True,
                "receive_missed_alerts": True,
            },
        )
        family = Member(
            profile_id=profile.id,
            name="Amit Patel",
            email="amit.family@example.com",
            phone="+91 98765 43212",
            role="FAMILY",
            passcode_hash=hash_passcode("9999"),
            permissions={
                "can_edit_meds": False,
                "view_all_meds": True,
                "view_appointments": True,
                "receive_missed_alerts": True,
            },
        )
        db.add_all([elder, caretaker, family])
        db.flush()

        # 3. Create Medications
        med_metformin = Medication(
            profile_id=profile.id,
            name="Metformin",
            dosage="500 mg",
            form="Tablet",
            instructions="After food with a glass of water",
            times_per_day=2,
            schedule_times=["08:30", "20:30"],
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            start_date=today_date - timedelta(days=90),
            notes="Blood sugar management (Type 2 Diabetes)",
            stock_count=42,
            refill_alert_threshold=10,
            is_active=True,
        )
        med_telmisartan = Medication(
            profile_id=profile.id,
            name="Telmisartan",
            dosage="40 mg",
            form="Tablet",
            instructions="Before breakfast in the morning",
            times_per_day=1,
            schedule_times=["08:00"],
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            start_date=today_date - timedelta(days=120),
            notes="Blood pressure maintenance",
            stock_count=28,
            refill_alert_threshold=7,
            is_active=True,
        )
        med_atorvastatin = Medication(
            profile_id=profile.id,
            name="Atorvastatin",
            dosage="10 mg",
            form="Tablet",
            instructions="At bedtime, after dinner",
            times_per_day=1,
            schedule_times=["21:30"],
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            start_date=today_date - timedelta(days=60),
            notes="Cholesterol control",
            stock_count=18,
            refill_alert_threshold=7,
            is_active=True,
        )
        med_shelcal = Medication(
            profile_id=profile.id,
            name="Shelcal-HD (Calcium + Vit D3)",
            dosage="500 mg",
            form="Tablet",
            instructions="After lunch with warm water",
            times_per_day=1,
            schedule_times=["14:00"],
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            start_date=today_date - timedelta(days=45),
            notes="Bone health & joint supplement",
            stock_count=52,
            refill_alert_threshold=10,
            is_active=True,
        )
        db.add_all([med_metformin, med_telmisartan, med_atorvastatin, med_shelcal])
        db.flush()

        # 4. Generate 30 days of Historical Dose Logs (for adherence ring & heatmap)
        all_meds = [med_telmisartan, med_metformin, med_shelcal, med_atorvastatin]
        dose_logs = []

        for days_ago in range(30, 0, -1):
            past_date = today_date - timedelta(days=days_ago)
            weekday = past_date.weekday()

            for med in all_meds:
                for time_str in med.schedule_times:
                    hour, minute = map(int, time_str.split(":"))
                    sched_local = datetime.combine(past_date, time(hour, minute), tzinfo=local_tz)
                    sched_utc = sched_local.astimezone(timezone.utc)

                    # Simulate realistic adherence (~93%)
                    # Weekend evening doses (e.g. Sunday/Saturday Atorvastatin or evening Metformin) have occasional missed pattern
                    is_weekend = weekday in [5, 6]
                    is_evening = hour >= 20

                    if is_weekend and is_evening and (days_ago % 7 in [1, 2]):
                        status = "MISSED"
                        acted_at = None
                        acted_by = None
                    elif days_ago == 14 and med == med_shelcal:
                        status = "SKIPPED"
                        acted_at = sched_utc + timedelta(minutes=20)
                        acted_by = elder.id
                    else:
                        status = "TAKEN"
                        # Acted 5-25 minutes after schedule
                        acted_at = sched_utc + timedelta(minutes=(days_ago * 3) % 20 + 5)
                        acted_by = elder.id

                    dose_log = DoseLog(
                        profile_id=profile.id,
                        medication_id=med.id,
                        scheduled_at=sched_utc,
                        status=status,
                        acted_at=acted_at,
                        acted_by_member_id=acted_by,
                        escalation_level=0 if status != "MISSED" else 2,
                    )
                    dose_logs.append(dose_log)

        # 5. Today's Dose Logs
        # Telmisartan 08:00 -> TAKEN
        sched_telmi = datetime.combine(today_date, time(8, 0), tzinfo=local_tz).astimezone(timezone.utc)
        dose_logs.append(DoseLog(
            profile_id=profile.id,
            medication_id=med_telmisartan.id,
            scheduled_at=sched_telmi,
            status="TAKEN",
            acted_at=sched_telmi + timedelta(minutes=8),
            acted_by_member_id=elder.id,
            escalation_level=0,
        ))

        # Metformin 08:30 -> TAKEN
        sched_met_morn = datetime.combine(today_date, time(8, 30), tzinfo=local_tz).astimezone(timezone.utc)
        dose_logs.append(DoseLog(
            profile_id=profile.id,
            medication_id=med_metformin.id,
            scheduled_at=sched_met_morn,
            status="TAKEN",
            acted_at=sched_met_morn + timedelta(minutes=15),
            acted_by_member_id=elder.id,
            escalation_level=0,
        ))

        # Shelcal-HD 14:00 -> PENDING or TAKEN depending on current time
        sched_shelcal = datetime.combine(today_date, time(14, 0), tzinfo=local_tz).astimezone(timezone.utc)
        shelcal_status = "TAKEN" if now_local.hour >= 14 else "PENDING"
        dose_logs.append(DoseLog(
            profile_id=profile.id,
            medication_id=med_shelcal.id,
            scheduled_at=sched_shelcal,
            status=shelcal_status,
            acted_at=sched_shelcal + timedelta(minutes=10) if shelcal_status == "TAKEN" else None,
            acted_by_member_id=elder.id if shelcal_status == "TAKEN" else None,
            escalation_level=0,
        ))

        # Metformin 20:30 -> PENDING (Upcoming evening dose)
        sched_met_eve = datetime.combine(today_date, time(20, 30), tzinfo=local_tz).astimezone(timezone.utc)
        dose_logs.append(DoseLog(
            profile_id=profile.id,
            medication_id=med_metformin.id,
            scheduled_at=sched_met_eve,
            status="PENDING",
            acted_at=None,
            acted_by_member_id=None,
            escalation_level=0,
        ))

        # Atorvastatin 21:30 -> PENDING (Upcoming night dose)
        sched_atorva = datetime.combine(today_date, time(21, 30), tzinfo=local_tz).astimezone(timezone.utc)
        dose_logs.append(DoseLog(
            profile_id=profile.id,
            medication_id=med_atorvastatin.id,
            scheduled_at=sched_atorva,
            status="PENDING",
            acted_at=None,
            acted_by_member_id=None,
            escalation_level=0,
        ))

        db.add_all(dose_logs)

        # 6. Appointments
        apt_tomorrow = Appointment(
            profile_id=profile.id,
            doctor_name="Dr. Arvind Shah",
            specialty="Cardiologist",
            location="Apollo Clinic, Indiranagar, Bengaluru",
            scheduled_datetime=datetime.combine(today_date + timedelta(days=1), time(10, 30), tzinfo=local_tz).astimezone(timezone.utc),
            notes="Quarterly blood pressure review, ECG check, and lipid profile evaluation.",
            status="SCHEDULED",
        )
        apt_next_week = Appointment(
            profile_id=profile.id,
            doctor_name="Dr. Sunita Rao",
            specialty="Endocrinologist",
            location="Manipal Hospital, Old Airport Road, Bengaluru",
            scheduled_datetime=datetime.combine(today_date + timedelta(days=7), time(11, 0), tzinfo=local_tz).astimezone(timezone.utc),
            notes="HbA1c test review, diabetic foot check, and Metformin dosage assessment.",
            status="SCHEDULED",
        )
        apt_past = Appointment(
            profile_id=profile.id,
            doctor_name="Dr. Rajesh Mehta",
            specialty="Ophthalmologist",
            location="Narayana Nethralaya, Rajajinagar, Bengaluru",
            scheduled_datetime=datetime.combine(today_date - timedelta(days=18), time(15, 0), tzinfo=local_tz).astimezone(timezone.utc),
            notes="Annual diabetic retinopathy examination. Retina is clear; next visit in 12 months.",
            status="COMPLETED",
        )
        db.add_all([apt_tomorrow, apt_next_week, apt_past])

        # 7. Audit Logs
        audit_1 = AuditLog(
            profile_id=profile.id,
            member_id=caretaker.id,
            actor_name="Priya Patel",
            action="PROFILE_CREATED",
            details={"message": "Created CareCircle for Ramesh Patel (Age 72)"},
            created_at=datetime.now(timezone.utc) - timedelta(days=30),
        )
        audit_2 = AuditLog(
            profile_id=profile.id,
            member_id=elder.id,
            actor_name="Ramesh Patel",
            action="DOSE_TAKEN",
            details={"medicine": "Telmisartan 40 mg", "time": "08:08 AM"},
            created_at=datetime.now(timezone.utc) - timedelta(hours=2),
        )
        audit_3 = AuditLog(
            profile_id=profile.id,
            member_id=elder.id,
            actor_name="Ramesh Patel",
            action="DOSE_TAKEN",
            details={"medicine": "Metformin 500 mg", "time": "08:45 AM"},
            created_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        # 8. Health Vitals (Last 7 days of readings)
        vitals = []
        for d in range(7, -1, -1):
            day_dt = datetime.combine(today_date - timedelta(days=d), time(9, 0), tzinfo=local_tz).astimezone(timezone.utc)
            # Blood Pressure (Systolic / Diastolic)
            bp_sys = 124.0 + (d % 3) * 2 - (d % 2) * 3
            bp_dia = 82.0 + (d % 2) * 2
            vitals.append(HealthVital(
                profile_id=profile.id,
                vital_type="BLOOD_PRESSURE",
                value_numeric=bp_sys,
                value_secondary=bp_dia,
                unit="mmHg",
                context="Resting morning reading",
                recorded_at=day_dt,
            ))
            # Blood Glucose Fasting
            glucose = 118.0 + (d * 3) % 15 - 4
            vitals.append(HealthVital(
                profile_id=profile.id,
                vital_type="BLOOD_GLUCOSE",
                value_numeric=glucose,
                unit="mg/dL",
                context="Fasting morning",
                recorded_at=day_dt,
            ))
            # Oxygen Saturation (SpO2)
            spo2 = 97.0 + (d % 3)
            vitals.append(HealthVital(
                profile_id=profile.id,
                vital_type="OXYGEN_SPO2",
                value_numeric=spo2,
                unit="%",
                context="Resting",
                recorded_at=day_dt,
            ))
            # Pulse / Heart Rate
            hr = 72.0 + (d % 4) * 2
            vitals.append(HealthVital(
                profile_id=profile.id,
                vital_type="HEART_RATE",
                value_numeric=hr,
                unit="bpm",
                context="Resting",
                recorded_at=day_dt,
            ))

        db.add_all(vitals)
        db.flush()

        # 6. Seed Daily Care Tasks (30-day routine plan with persistent alerts)
        task_walk = CareTask(
            profile_id=profile.id,
            title="Morning Garden Walk (20 Mins)",
            description="Gentle morning walk on the lawn with walking stick. Fresh morning sunlight.",
            category="EXERCISE",
            scheduled_time="07:00",
            start_date=today_date - timedelta(days=15),
            end_date=today_date + timedelta(days=15),
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            frequency="DAILY",
            persistent_alert=True,
            created_by_member_id=caretaker.id,
            created_by_name=caretaker.name,
            is_active=True,
        )
        task_sugar = CareTask(
            profile_id=profile.id,
            title="Fasting Blood Glucose Check",
            description="Use Accu-Chek glucometer before morning breakfast. Target < 120 mg/dL.",
            category="HEALTH_CHECK",
            scheduled_time="08:00",
            start_date=today_date - timedelta(days=15),
            end_date=today_date + timedelta(days=15),
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            frequency="DAILY",
            persistent_alert=True,
            created_by_member_id=caretaker.id,
            created_by_name=caretaker.name,
            is_active=True,
        )
        task_milk = CareTask(
            profile_id=profile.id,
            title="Warm Haldi Doodh & Hydration",
            description="Drink warm turmeric milk 30 minutes before sleep for joint comfort and rest.",
            category="NUTRITION",
            scheduled_time="20:30",
            start_date=today_date - timedelta(days=15),
            end_date=today_date + timedelta(days=15),
            days_of_week=[0, 1, 2, 3, 4, 5, 6],
            frequency="DAILY",
            persistent_alert=True,
            created_by_member_id=family.id,
            created_by_name=family.name,
            is_active=True,
        )
        db.add_all([task_walk, task_sugar, task_milk])
        db.flush()

        # Seed task logs for today
        db.add(CareTaskLog(
            task_id=task_walk.id,
            profile_id=profile.id,
            scheduled_date=today_date,
            status="COMPLETED",
            completed_at=datetime.now(timezone.utc) - timedelta(hours=3),
            completed_by_member_id=elder.id,
            completed_by_name=elder.name,
            notes="Walked 22 minutes, felt energized",
            nudge_count=0,
        ))
        db.add(CareTaskLog(
            task_id=task_sugar.id,
            profile_id=profile.id,
            scheduled_date=today_date,
            status="COMPLETED",
            completed_at=datetime.now(timezone.utc) - timedelta(hours=2),
            completed_by_member_id=caretaker.id,
            completed_by_name=caretaker.name,
            notes="114 mg/dL fasting",
            nudge_count=0,
        ))
        db.add(CareTaskLog(
            task_id=task_milk.id,
            profile_id=profile.id,
            scheduled_date=today_date,
            status="PENDING",
            nudge_count=0,
        ))

        # 7. Seed Family Community Messages & Nudges
        db.add_all([
            FamilyMessage(
                profile_id=profile.id,
                sender_member_id=family.id,
                sender_name="Amit Patel (Son)",
                sender_role="FAMILY",
                message_text="Dada ji, good morning! Priya told me your sugar level is 114 today, fantastic progress! ❤️",
                message_type="LOVING_NOTE",
                is_urgent=False,
                is_read_by_elder=True,
                read_at=datetime.now(timezone.utc) - timedelta(hours=2),
                reactions="❤️ 🙏",
                created_at=datetime.now(timezone.utc) - timedelta(hours=3),
            ),
            FamilyMessage(
                profile_id=profile.id,
                sender_member_id=caretaker.id,
                sender_name="Priya Patel (Caretaker)",
                sender_role="CARETAKER",
                message_text="Dada ji, Dr. Gupta's cardiology review is confirmed for this Thursday at 10:30 AM. I will accompany you in the car.",
                message_type="TASK_ALERT",
                is_urgent=False,
                is_read_by_elder=True,
                read_at=datetime.now(timezone.utc) - timedelta(hours=1),
                reactions="👍",
                created_at=datetime.now(timezone.utc) - timedelta(hours=2),
            ),
            FamilyMessage(
                profile_id=profile.id,
                sender_member_id=elder.id,
                sender_name="Ramesh Patel (Dada ji)",
                sender_role="ELDER",
                message_text="Thank you beta! Yes, morning walk is completed in the lawn and I had light poha. Feeling very active today.",
                message_type="LOVING_NOTE",
                is_urgent=False,
                is_read_by_elder=True,
                read_at=datetime.now(timezone.utc),
                reactions="❤️",
                created_at=datetime.now(timezone.utc) - timedelta(hours=1),
            ),
            FamilyMessage(
                profile_id=profile.id,
                sender_member_id=family.id,
                sender_name="Amit Patel (Son)",
                sender_role="FAMILY",
                message_text="Dada ji, gentle reminder for your afternoon Metformin after lunch! Have a great afternoon. 🌸",
                message_type="MED_NUDGE",
                is_urgent=False,
                is_read_by_elder=False,
                reactions="❤️",
                created_at=datetime.now(timezone.utc) - timedelta(minutes=25),
            ),
        ])

        db.commit()

        return {
            "status": "success",
            "profile_code": demo_code,
            "elder": {"name": elder.name, "passcode": "1234", "role": "ELDER"},
            "caretaker": {"name": caretaker.name, "passcode": "5678", "role": "CARETAKER"},
            "family": {"name": family.name, "passcode": "9999", "role": "FAMILY"},
            "medications_seeded": len(all_meds),
            "dose_logs_seeded": len(dose_logs),
            "appointments_seeded": 3,
        }

    except Exception as exc:
        db.rollback()
        raise exc
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    print("🌱 Seeding CareCircle database with realistic demo data...")
    summary = seed_database()
    print("✅ Database successfully seeded!")
    print(f"   Profile Code: {summary['profile_code']}")
    print(f"   Elder Login:     Passcode {summary['elder']['passcode']} ({summary['elder']['name']})")
    print(f"   Caretaker Login: Passcode {summary['caretaker']['passcode']} ({summary['caretaker']['name']})")
    print(f"   Family Login:    Passcode {summary['family']['passcode']} ({summary['family']['name']})")
    print(f"   Total Dose Logs: {summary['dose_logs_seeded']} (30-day history + today)")
    print(f"   Appointments:    {summary['appointments_seeded']}")
