import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "DawaSaathi 365"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "sqlite:///./carecircle.db"

    # Security & JWT
    SECRET_KEY: str = "carecircle-super-secret-key-change-in-production-2026-hackathon"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Defaults
    TIMEZONE: str = "Asia/Kolkata"

    # AI (Gemini)
    GEMINI_API_KEY: str = ""

    # Email
    EMAIL_MODE: str = "console"  # 'console' or 'smtp'
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "DawaSaathi 365 <alerts@dawasaathi.in>"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
