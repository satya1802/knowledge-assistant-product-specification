"""Gemini Client (gemini_client).

The only place the Gemini API key is read or handed to the SDK. Model names
come from `Settings` (`gemini_chat_model`, `gemini_embedding_model`) and
nowhere else, so changing `GEMINI_CHAT_MODEL`/`GEMINI_EMBEDDING_MODEL` in
`backend/.env` and restarting changes which model this client calls with no
code change (AC-091).

With no API key configured -- or with `OFFLINE_FALLBACK_ENABLED=true`, the
default -- `answer()` and `embed()` return a clearly marked stub instead of
calling out to Gemini or raising (AC-092), so the app, its `/health` route
and its OpenAPI document all work with no credential, for local development
and tests.
"""

from __future__ import annotations

from app.config import Settings, get_settings

STUB_PREFIX = "[offline fallback]"
_STUB_EMBEDDING_DIMENSIONS = 768


class GeminiClient:
    """Wraps the Gemini SDK; the API key never leaves this instance.

    The underlying `google.genai.Client` is constructed lazily, and only
    when real (non-offline) use is attempted, so importing or instantiating
    this class with no key configured never touches the network.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._sdk_client = None

    def _is_offline(self) -> bool:
        return not self._settings.gemini_api_key or self._settings.offline_fallback_enabled

    def answer(self, prompt: str) -> str:
        """Returns Gemini's answer, or a clearly marked stub when offline."""
        if self._is_offline():
            return f"{STUB_PREFIX} answer for: {prompt}"
        response = self._sdk().models.generate_content(
            model=self._settings.gemini_chat_model,
            contents=prompt,
        )
        return response.text

    def embed(self, text: str) -> list[float]:
        """Returns an embedding vector, or a stub zero-vector when offline."""
        if self._is_offline():
            return [0.0] * _STUB_EMBEDDING_DIMENSIONS
        response = self._sdk().models.embed_content(
            model=self._settings.gemini_embedding_model,
            contents=text,
        )
        return list(response.embeddings[0].values)

    def _sdk(self):
        if self._sdk_client is None:
            from google import genai

            self._sdk_client = genai.Client(api_key=self._settings.gemini_api_key)
        return self._sdk_client


_default_client: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    """One client per process, built from the shared cached `Settings`."""
    global _default_client
    if _default_client is None:
        _default_client = GeminiClient()
    return _default_client


def answer(prompt: str) -> str:
    """Module-level convenience matching this task's contract."""
    return get_gemini_client().answer(prompt)
