from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    bot_token: str = ""
    backend_base_url: str = "http://localhost:8000"
    bot_storage_path: str = ".bot_state.json"
    openai_feedback_enabled: bool = True
    session_timeout_hours: int = 24


settings = Settings()
