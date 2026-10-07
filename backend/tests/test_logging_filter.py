"""Tests proving the redacting log filter keeps secrets out of log output."""

import logging
import sys

from app.config import Settings
from app.logging_filter import SecretRedactingFilter


def _settings(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


def test_redacts_secret_from_a_plain_log_message() -> None:
    settings = _settings(gemini_api_key="sek-abc123", admin_password="hunter2")
    filt = SecretRedactingFilter(settings)
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="using key sek-abc123 and password hunter2",
        args=None,
        exc_info=None,
    )

    filt.filter(record)

    message = record.getMessage()
    assert "sek-abc123" not in message
    assert "hunter2" not in message
    assert "***REDACTED***" in message


def test_redacts_secret_passed_as_log_args() -> None:
    settings = _settings(gemini_api_key="sek-abc123")
    filt = SecretRedactingFilter(settings)
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="calling gemini with key %s",
        args=("sek-abc123",),
        exc_info=None,
    )

    filt.filter(record)

    assert "sek-abc123" not in record.getMessage()


def test_sanitises_an_exception_that_carries_the_secret() -> None:
    settings = _settings(gemini_api_key="sek-super-secret")
    filt = SecretRedactingFilter(settings)
    try:
        raise RuntimeError("Gemini rejected key sek-super-secret")
    except RuntimeError:
        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname=__file__,
            lineno=1,
            msg="request failed",
            args=None,
            exc_info=sys.exc_info(),
        )

    filt.filter(record)

    assert record.exc_info is None
    assert "sek-super-secret" not in (record.exc_text or "")


def test_no_secrets_configured_passes_records_through_unchanged() -> None:
    settings = _settings(gemini_api_key=None, admin_password=None)
    filt = SecretRedactingFilter(settings)
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="nothing secret here",
        args=None,
        exc_info=None,
    )

    assert filt.filter(record) is True
    assert record.getMessage() == "nothing secret here"
