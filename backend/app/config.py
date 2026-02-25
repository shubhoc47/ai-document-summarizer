from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "ai-doc-summarizer"
    ENV: str = "local"  # local|prod
    API_PREFIX: str = "/api"
    MAX_UPLOAD_MB: int = 20


settings = Settings()