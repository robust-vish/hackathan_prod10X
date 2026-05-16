from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openproject_base_url: str = "https://project.intermesh.net"
    openproject_api_key: str = ""
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    groq_api_key: str = ""
    llm_provider: str = "groq"   # claude | groq | gemini
    apps_script_url: str = ""    # Google Apps Script Web App URL for notifications
    email_domain: str = "indiamart.com"
    port: int = 8000
    host: str = "0.0.0.0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
