from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str
    paperclip_api_url: str = "http://localhost:3100"
    paperclip_api_token: str
    default_company_id: str
    itsm_base_url: str = "https://itsm.mlinterviewnotes.com"
    api_port: int = 8100

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
