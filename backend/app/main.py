from contextlib import asynccontextmanager
from datetime import datetime, timezone
import zoneinfo
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
import app.models  # noqa: F401
from app.services.scheduler_service import start_scheduler

# Import API routers
from app.api.auth import router as auth_router
from app.api.medications import router as meds_router
from app.api.doses import router as doses_router
from app.api.actions import router as actions_router
from app.api.appointments import router as apts_router
from app.api.vitals import router as vitals_router
from app.api.care_circle import router as circle_router
from app.api.emergency import router as emergency_router
from app.api.ai import router as ai_router
from app.api.demo import router as demo_router
from app.api.tasks import router as tasks_router
from app.api.community import router as community_router
from app.api.emergency_card import router as emergency_card_router
from app.api.checkins import router as checkins_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Start APScheduler background engine
    start_scheduler()
    yield


app = FastAPI(
    title="DawaSaathi 365 API",
    description="Intelligent Closed-Loop Elderly Care & Medication Management Ecosystem",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup: Local development + Vercel Production & Preview + Custom Domains
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://dawasaathi-365.vercel.app",
    "https://dawasaathi-365.onrender.com",
]
origins = [o for o in origins if o]

origin_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://[a-zA-Z0-9_-]+\.vercel\.app$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(meds_router)
app.include_router(doses_router)
app.include_router(actions_router)
app.include_router(apts_router)
app.include_router(vitals_router)
app.include_router(circle_router)
app.include_router(emergency_router)
app.include_router(ai_router)
app.include_router(demo_router)
app.include_router(tasks_router)
app.include_router(community_router)
app.include_router(emergency_card_router)
app.include_router(checkins_router)


@app.get("/", tags=["General"])
def root():
    return {
        "app": settings.APP_NAME,
        "tagline": "Not a reminder app, a closed-loop care system. The elder stays in control; family is alerted only when it matters.",
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Health check verifying API responsiveness and live DB connectivity."""
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    utc_now = datetime.now(timezone.utc)
    try:
        local_tz = zoneinfo.ZoneInfo(settings.TIMEZONE)
        local_now = utc_now.astimezone(local_tz)
        local_time_str = local_now.isoformat()
    except Exception:
        local_time_str = utc_now.isoformat()

    return {
        "status": "healthy" if db_connected else "degraded",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "database_connected": db_connected,
        "email_mode": settings.EMAIL_MODE,
        "timezone": settings.TIMEZONE,
        "server_time_utc": utc_now.isoformat(),
        "server_time_local": local_time_str,
        "version": "1.0.0",
    }
