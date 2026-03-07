from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional
from pathlib import Path


# Get the directory where settings.py is located
_SETTINGS_DIR = Path(__file__).parent.parent.parent


class Settings(BaseSettings):
    # Existing settings
    anthropic_api_key: str
    paperclip_api_url: str = "http://localhost:3100"
    paperclip_api_token: str = ""
    default_company_id: str
    itsm_base_url: str = "https://itsm.mlinterviewnotes.com"
    api_port: int = 8100

    # Database settings
    database_url: str = "postgresql+asyncpg://chat_user:password@localhost:5432/itsm_chat"

    # JWT settings
    jwt_secret: str = "your-256-bit-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    refresh_token_expire_days: int = 7

    # Paperclip WebSocket
    paperclip_ws_url: Optional[str] = None

    @property
    def paperclip_websocket_url(self) -> str:
        """Generate WebSocket URL for Paperclip events."""
        if self.paperclip_ws_url:
            return self.paperclip_ws_url
        # Convert HTTP URL to WebSocket URL
        ws_base = self.paperclip_api_url.replace("http://", "ws://").replace("https://", "wss://")
        return f"{ws_base}/api/companies/{self.default_company_id}/events/ws"

    model_config = SettingsConfigDict(
        env_file=str(_SETTINGS_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"  # Ignore extra env vars like VITE_*
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
