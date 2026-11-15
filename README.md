# CareCircle (DawaSaathi 365)
### AI-Powered Elderly Care & Closed-Loop Medication Intelligence Ecosystem
> **Catalyst – Solo AI Hackathon 2026**
> **USP:** *"Not a reminder app, a closed-loop care system. The elder stays in control; family is alerted only when it matters."*

---

## 🌟 Overview & Official Problem Statement Solved
Elderly individuals often struggle with complex multi-dose schedules, forgotten doctor visits, and isolated healthcare routines, while family members living in other cities worry constantly without visibility.

**CareCircle (DawaSaathi 365)** bridges this gap by creating an interconnected healthcare circle where:
- The **Elder** accesses an ultra-simple, distraction-free **Elder Mode** (high contrast, huge 64px touch targets, font scaling A/A+/A++, calm reassurance, zero noise).
- The **Caretaker & Family** access an intelligent **Care Dashboard** with real-time adherence rings, a 30-day GitHub-style adherence heatmap, health vitals trends, pill stock inventory, and proactive escalations.
- **Closed-Loop Verification**: Scheduled doses are tracked through active `dose_logs`. If a dose is overdue, a 3-tier escalation ladder alerts the elder first, then the caretaker, and finally the family — complete with **passwordless single-use magic links** so family members can confirm medication with one click directly from their email without logging in!
- **Gemini AI Innovation**:
  1. **Prescription Scanner (Gemini Vision)**: Snap a prescription photo to extract medicines, dosages, and timings into an editable review table before saving.
  2. **Natural Language Parser (Hinglish/Hindi/English)**: Speak or type naturally (*"kal subah 10 baje Dr. Shah ke saath appointment"* or *"Metformin 500 subah shaam khana khane ke baad"*) to automatically structure entries.
  3. **DawaSaathi AI Voice Assistant**: Conversational companion answering questions in Hindi/English with browser Web Speech API voice synthesis.
  4. **AI Adherence Insights & Doctor Visit Brief**: Summarizes real dose log patterns (e.g. weekend evening lapses) and generates a printable 1-page clinical brief for doctor consultations.

---

## 🚀 Live Localhost Endpoints (Running Now)

| Service | Localhost URL | Notes |
| :--- | :--- | :--- |
| **Frontend Application** | [http://localhost:5173](http://localhost:5173) | Interactive React + Vite Dashboard |
| **Backend API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI (FastAPI) |
| **API Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | Live DB & scheduler status |

---

## 🔑 Instant Hackathon Demo Login (No Setup Needed!)

On [http://localhost:5173/login](http://localhost:5173/login), click **"Try Live Demo"** or select one of the instant role buttons:
- **Elder Login**: Profile Code `CARE-7291` | Passcode `1234` (*Ramesh Patel, 72*)
- **Caretaker Login**: Profile Code `CARE-7291` | Passcode `5678` (*Priya Patel, Daughter*)
- **Family Login**: Profile Code `CARE-7291` | Passcode `9999` (*Amit Patel, Son in Bengaluru*)

---

## 📱 All 14 Ecosystem Modules Built & Functional

1. **Home / Dashboard**: Ultra-clean hero card (*Next Medicine: 8:30 PM Metformin, after food* with live countdown & 64px *"I took it ✓"* button, today's dots progress strip, quiet status chip).
2. **My Medications**: Full CRUD, dosage, form, instructions, active toggle, pill inventory decrement on dose taken.
3. **AI Voice Assistant (DawaSaathi)**: Natural Hinglish/Hindi speech recognition & voice synthesis with strict medical safety guardrails.
4. **AI Prescription Scanner**: Upload prescription image $\rightarrow$ Gemini extracts medications $\rightarrow$ editable confirmation screen before saving.
5. **Doctor Appointments**: Consultation calendar, upcoming countdowns, preparation checklists, and Hinglish voice scheduler.
6. **Health Vitals Dashboard**: Interactive trend charts for Blood Pressure (systolic/diastolic), Blood Glucose, Oxygen (SpO2), Heart Rate, and Weight.
7. **Family Care Circle**: Member management, secure passcode assignment, and **elder-governed privacy controls** (who can edit, view, or receive missed alerts).
8. **Medicine Stock & Inventory**: Days-remaining countdown, low-stock alerts, and 1-click pill refills (+30).
9. **AI Health Insights**: Adherence score (Today / 7-Day / 30-Day), behavioral pattern recognition, and printable **1-Page Doctor Visit Brief**.
10. **30-Day Adherence Heatmap**: Interactive GitHub-style grid showing daily compliance levels with hover tooltips.
11. **Emergency SOS**: 1-tap SOS broadcast with a 3-second safety abort countdown, dispatching urgent email notifications to all circle contacts.
12. **Notifications & Escalation Center**: Audit trail of reminder dispatches and 1-click test email trigger button.
13. **Privacy & Settings**: Granular sliders for Grace Window (15–120 mins), Tier 1 & Tier 2 escalation timings, language toggle (EN / HI / GUJ), and font scaling (A / A+ / A++).
14. **Passwordless Magic Links**: Direct token execution endpoint (`/action?token=...`) allowing instant dose confirmation from email without login.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React, React Router 6.
- **Backend**: Python 3.14 / FastAPI, SQLAlchemy, Pydantic, APScheduler (in-process 60s background engine), bcrypt, PyJWT, itsdangerous.
- **Database**: SQLite locally (`carecircle.db`), 100% compatible with PostgreSQL (Neon / Supabase / Render) via `DATABASE_URL`.
- **AI**: Google Gemini API (`gemini-2.5-flash`), with intelligent local heuristics fallback.
- **Email**: SMTP / Gmail App Password, with zero-setup `EMAIL_MODE=console` fallback.

---

## 🏁 Quick Terminal Commands

### Run Backend:
```bash
cd backend
source venv/bin/activate
PYTHONPATH=backend python seed.py
PYTHONPATH=backend uvicorn app.main:app --reload --port 8000
```

### Run Frontend:
```bash
cd frontend
npm run dev -- --port 5173
```
