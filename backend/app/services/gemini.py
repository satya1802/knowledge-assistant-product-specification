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

import time
from collections.abc import Iterator

from app.config import Settings, get_settings

STUB_PREFIX = "[offline fallback]"
_STUB_EMBEDDING_DIMENSIONS = 768
_MAX_STREAM_RETRIES = 3
_RETRY_BASE_DELAY_SECONDS = 0.5
_RETRYABLE_MARKERS = (
    "429",
    "503",
    "resource_exhausted",
    "unavailable",
    "overloaded",
    "rate limit",
)


class GeminiOverloadedError(RuntimeError):
    """Raised when Gemini stayed overloaded/rate-limited through every retry.

    Carries no part of the underlying SDK exception (which can quote the
    model name or echo request details) -- callers show a fixed,
    plain-language message instead.
    """


def _is_retryable(exc: Exception) -> bool:
    text = f"{type(exc).__name__} {exc}".lower()
    return any(marker in text for marker in _RETRYABLE_MARKERS)


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

    def answer_stream(self, prompt: str) -> Iterator[str]:
        """Yields answer text incrementally as Gemini streams it.

        Offline fallback yields the same marked stub `answer()` returns, as
        a single chunk, so callers that only ever use `answer_stream` still
        work with no key configured.

        A 429/503/"overloaded" failure is retried with bounded exponential
        backoff, but only while nothing has been yielded yet for this call --
        once a token has reached the caller it cannot be un-sent, so a
        failure after that point is raised immediately rather than retried
        (which would duplicate or interleave partial answers). Retries
        exhausted with nothing yielded raises `GeminiOverloadedError`, whose
        message never includes the model name or any SDK-provided detail.
        """
        if self._is_offline():
            yield f"{STUB_PREFIX} answer for: {prompt}"
            return

        delay = _RETRY_BASE_DELAY_SECONDS
        for attempt in range(1, _MAX_STREAM_RETRIES + 1):
            yielded_any = False
            try:
                stream = self._sdk().models.generate_content_stream(
                    model=self._settings.gemini_chat_model,
                    contents=prompt,
                )
                for chunk in stream:
                    text = getattr(chunk, "text", None)
                    if text:
                        yielded_any = True
                        yield text
                return
            except Exception as exc:
                if yielded_any:
                    raise
                if not _is_retryable(exc) or attempt == _MAX_STREAM_RETRIES:
                    if _is_retryable(exc):
                        raise GeminiOverloadedError(
                            "The assistant is temporarily overloaded."
                        ) from None
                    raise
                time.sleep(delay)
                delay *= 2

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
