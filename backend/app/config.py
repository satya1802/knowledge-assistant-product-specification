"""Configuration & Secrets (config_svc).

Loads `backend/.env` once and hands every other component the same typed
settings object. The Gemini API key and anything else secret are declared
with `repr=False` so a stray `print(settings)` or an exception that includes
`repr(settings)` in its traceback cannot leak them; nothing here ever logs a
secret value.

`backend/.env` is gitignored (see `backend/.gitignore`); `backend/.env.example`
documents every variable this file reads, with a safe default or a placeholder.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Gemini (gemini_client) ---------------------------------------
    # No key: offline_fallback_enabled lets the app run with a canned,
    # no-network stub so local development and tests need no credential.
    gemini_api_key: str | None = Field(default=None, repr=False)
    gemini_chat_model: str = Field(default="gemini-flash-lite-latest")
    gemini_embedding_model: str = Field(default="gemini-embedding-001")
    gemini_image_model: str = Field(default="gemini-2.5-flash-image")
    offline_fallback_enabled: bool = Field(default=True)

    # --- Auth & Session (auth_svc) --------------------------------------
    self_registration_enabled: bool = Field(default=True)
    admin_email: str | None = Field(default=None)
    admin_password: str | None = Field(default=None, repr=False)
    min_password_length: int = Field(default=12)
    session_cookie_name: str = Field(default="ka_session")
    session_ttl_days: int = Field(default=30)
    lockout_threshold: int = Field(default=5)
    lockout_window_minutes: int = Field(default=15)

    # --- Knowledge base (doc_svc / ingest_svc) --------------------------
    max_upload_mb: int = Field(default=25)
    relevance_threshold: float = Field(default=0.75)

    # --- Chat context (chat_svc) ----------------------------------------
    # Upper bound, in characters, on how much prior-turn history is folded
    # into the retrieval query and generation prompt for a single request.
    # Oldest turns are trimmed first; the current question is never trimmed.
    chat_history_char_budget: int = Field(default=4000)

    # --- Object store ----------------------------------------------------
    storage_backend: str = Field(default="local")  # "local" | "s3"
    storage_path: str = Field(default="./data/uploads")
    s3_bucket: str | None = Field(default=None)

    # --- api_gateway -------------------------------------------------------
    allowed_origins: str = Field(default="")

    # --- db ------------------------------------------------------------
    database_url: str = Field(default="sqlite:///./app.db")


@lru_cache
def get_settings() -> Settings:
    """Cached so every component shares one parsed, validated instance."""
    return Settings()
