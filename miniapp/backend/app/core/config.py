import os
from datetime import datetime, UTC

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "VERUM Mini App API"
    environment: str = "development"
    database_url: str = "sqlite:///./verum_miniapp.db"
    jwt_secret: str = "change-me"
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_webapp_url: str = "http://localhost:5173"
    telegram_miniapp_short_name: str = ""
    admin_access_code: str = "VERUM2026ADMIN"
    admin_telegram_user_ids: str = "697068570"
    admin_email: str = "admin@verum.app"
    frontend_dist_dir: str = "/app/frontend_dist"
    enable_bot_polling: bool = True
    app_version: str = os.getenv("APP_VERSION") or os.getenv("RAILWAY_GIT_COMMIT_SHA") or os.getenv("RAILWAY_DEPLOYMENT_ID") or datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@verum.app"
    smtp_use_tls: bool = True


settings = Settings()
