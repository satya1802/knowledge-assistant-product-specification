"""Tests for gemini_client's offline fallback and settings-driven model names."""

from app.config import Settings
from app.services.gemini import STUB_PREFIX, GeminiClient, answer


def test_answer_is_a_marked_stub_with_no_api_key() -> None:
    client = GeminiClient(Settings(_env_file=None, gemini_api_key=None))

    result = client.answer("what is our refund policy?")

    assert result.startswith(STUB_PREFIX)
    assert "what is our refund policy?" in result


def test_answer_does_not_raise_with_no_api_key() -> None:
    client = GeminiClient(Settings(_env_file=None, gemini_api_key=None))

    # No exception means AC-092 holds: a missing key never raises.
    client.answer("hello")


def test_embed_is_a_stub_vector_with_no_api_key() -> None:
    client = GeminiClient(Settings(_env_file=None, gemini_api_key=None))

    vector = client.embed("some text")

    assert isinstance(vector, list)
    assert len(vector) == 768
    assert all(v == 0.0 for v in vector)


def test_offline_fallback_enabled_stubs_even_with_a_key_configured() -> None:
    client = GeminiClient(
        Settings(_env_file=None, gemini_api_key="sek-present", offline_fallback_enabled=True)
    )

    result = client.answer("hi")

    assert result.startswith(STUB_PREFIX)


def test_client_reads_model_names_from_settings_not_literals() -> None:
    settings = Settings(
        _env_file=None,
        gemini_chat_model="totally-custom-answer-model",
        gemini_embedding_model="totally-custom-embedding-model",
    )
    client = GeminiClient(settings)

    assert client._settings.gemini_chat_model == "totally-custom-answer-model"
    assert client._settings.gemini_embedding_model == "totally-custom-embedding-model"


def test_module_level_answer_uses_default_client_and_is_a_stub() -> None:
    result = answer("ping")

    assert result.startswith(STUB_PREFIX)
