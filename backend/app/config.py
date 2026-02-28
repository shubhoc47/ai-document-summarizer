from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "ai-doc-summarizer"
    ENV: str = "local"  # local|prod
    API_PREFIX: str = "/api"
    MAX_UPLOAD_MB: int = 20
    GEMINI_API_KEY: str = Field(default="", repr=False)
    LLM_MODEL: str = "gemini-2.5-flash"


settings = Settings()