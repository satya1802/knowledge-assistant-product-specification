"""Tests for config_svc's shared Settings object."""

from app.config import Settings, get_settings


def test_defaults_with_no_env_file() -> None:
    s = Settings(_env_file=None)

    assert s.gemini_api_key is None
    assert s.gemini_chat_model == "gemini-flash-lite-latest"
    assert s.gemini_embedding_model == "gemini-embedding-001"
    assert s.offline_fallback_enabled is True
    assert s.self_registration_enabled is True
    assert s.min_password_length == 12
    assert s.session_ttl_days == 30
    assert s.lockout_threshold == 5
    assert s.lockout_window_minutes == 15


def test_model_names_are_overridable_from_env(monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_CHAT_MODEL", "custom-answer-model")
    monkeypatch.setenv("GEMINI_EMBEDDING_MODEL", "custom-embedding-model")

    s = Settings(_env_file=None)

    assert s.gemini_chat_model == "custom-answer-model"
    assert s.gemini_embedding_model == "custom-embedding-model"


def test_repr_never_includes_secret_values() -> None:
    s = Settings(
        _env_file=None,
        gemini_api_key="sek-super-secret-value",
        admin_password="hunter2-password",
    )

    text = repr(s)

    assert "sek-super-secret-value" not in text
    assert "hunter2-password" not in text


def test_str_never_includes_secret_values() -> None:
    s = Settings(
        _env_file=None,
        gemini_api_key="sek-super-secret-value",
        admin_password="hunter2-password",
    )

    text = str(s)

    assert "sek-super-secret-value" not in text
    assert "hunter2-password" not in text


def test_get_settings_is_cached_singleton() -> None:
    assert get_settings() is get_settings()
