from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Avenir API"
    database_url: str = "sqlite:///./job_portal.db"
    database_url_fallback: str | None = None
    secret_key: str = "change-this-secret-before-deployment"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    adzuna_app_id: str | None = None
    adzuna_app_key: str | None = None
    jooble_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
