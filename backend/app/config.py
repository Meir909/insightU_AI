from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_candidates_table: str = "candidates"
    supabase_applications_table: str = "applications"
    allow_mock_storage: bool = True
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3001"])


settings = Settings()
