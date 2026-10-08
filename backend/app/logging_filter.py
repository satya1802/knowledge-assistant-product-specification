"""Redacting log filter (config_svc).

Every secret in `Settings` is declared `repr=False`, which keeps it out of
`repr(settings)`, but a handler can still interpolate a raw secret value
into a log message or an exception can carry one in its text. This filter
is the last line of defence: attached to the root logger (and uvicorn's
loggers) at startup, it scrubs every configured secret out of every log
record before it is formatted or emitted, including records that carry a
live exception.
"""

from __future__ import annotations

import logging

from app.config import Settings, get_settings

_REDACTED = "***REDACTED***"


class SecretRedactingFilter(logging.Filter):
    """Replaces every secret value from `Settings` with a redaction marker."""

    def __init__(self, settings: Settings | None = None) -> None:
        super().__init__()
        self._settings = settings

    def _secrets(self) -> list[str]:
        settings = self._settings or get_settings()
        values = [settings.gemini_api_key, settings.admin_password]
        return [v for v in values if v]

    def filter(self, record: logging.LogRecord) -> bool:
        secrets = self._secrets()
        if not secrets:
            return True

        record.msg = self._redact(record.msg, secrets)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: self._redact(v, secrets) for k, v in record.args.items()}
            else:
                record.args = tuple(self._redact(a, secrets) for a in record.args)

        if record.exc_info:
            exc_type, exc_value, _ = record.exc_info
            exc_text = str(exc_value) if exc_value else ""
            if any(secret in exc_text for secret in secrets):
                # A traceback cannot be redacted after the fact without losing
                # it entirely, so a secret-bearing exception is replaced with
                # a sanitised summary rather than risk leaking it.
                name = exc_type.__name__ if exc_type else "Exception"
                record.exc_info = None
                record.exc_text = f"{name}: {self._redact(exc_text, secrets)} (redacted)"

        return True

    @staticmethod
    def _redact(value: object, secrets: list[str]) -> object:
        if not isinstance(value, str):
            return value
        for secret in secrets:
            if secret and secret in value:
                value = value.replace(secret, _REDACTED)
        return value


def install_redacting_filter() -> None:
    """Attach the filter to the root logger and uvicorn's named loggers.

    Idempotent against being called more than once (e.g. module reload in
    tests): `logging.Filterer.addFilter` is a no-op if the same instance is
    already attached, but each call here makes a fresh instance, so this
    only needs to run once, at application startup.
    """
    filt = SecretRedactingFilter()
    for name in ("", "uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).addFilter(filt)
