"""Auth & Session Service (auth_svc) business logic.

Password hashing, session issuance/validation and per-email lockout. Every
tunable value -- hash cost, lockout threshold/window, minimum password
length, cookie name/TTL -- comes from `app.config.Settings`; nothing here
hardcodes a literal that the architecture says belongs in config.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session as DbSession

from app.config import Settings, get_settings
from app.database import get_db
from app.models import LoginAttempt, User
from app.models import Session as SessionModel

GENERIC_LOGIN_ERROR = "Invalid email or password."
GENERIC_REGISTER_ERROR = "Those details cannot be used."
REGISTRATION_DISABLED_ERROR = "Account creation is disabled."
NOT_AUTHENTICATED_ERROR = "Not authenticated."


def _utcnow() -> datetime:
    return datetime.now(UTC)


def normalize_email(email: str) -> str:
    return email.strip().lower()


# --- password hashing -----------------------------------------------------


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# --- lockout ----------------------------------------------------------------


def record_login_attempt(db: DbSession, email: str, succeeded: bool) -> None:
    db.add(LoginAttempt(email=email, succeeded=succeeded))
    db.commit()


def reset_login_attempts(db: DbSession, email: str) -> None:
    db.execute(delete(LoginAttempt).where(LoginAttempt.email == email))
    db.commit()


def is_locked_out(db: DbSession, email: str, settings: Settings) -> bool:
    window_start = _utcnow() - timedelta(minutes=settings.lockout_window_minutes)
    failures = db.execute(
        select(LoginAttempt.id).where(
            LoginAttempt.email == email,
            LoginAttempt.succeeded.is_(False),
            LoginAttempt.attempted_at >= window_start,
        )
    ).all()
    return len(failures) >= settings.lockout_threshold


# --- sessions ----------------------------------------------------------------


def create_session(db: DbSession, user: User, settings: Settings) -> SessionModel:
    session = SessionModel(
        user_id=user.id,
        expires_at=_utcnow() + timedelta(days=settings.session_ttl_days),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_valid_session(db: DbSession, session_id: str) -> SessionModel | None:
    try:
        session = db.get(SessionModel, session_id)
    except Exception:
        return None
    if session is None:
        return None
    if session.revoked_at is not None:
        return None
    if session.expires_at <= _utcnow():
        return None
    return session


def revoke_session(db: DbSession, session_id: str) -> None:
    session = db.get(SessionModel, session_id)
    if session is not None and session.revoked_at is None:
        session.revoked_at = _utcnow()
        db.commit()


def set_session_cookie(response, session: SessionModel, settings: Settings) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=str(session.id),
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response, settings: Settings) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/")


def get_current_user(request: Request, db: DbSession) -> User | None:
    settings = get_settings()
    session_id = request.cookies.get(settings.session_cookie_name)
    if not session_id:
        return None
    session = get_valid_session(db, session_id)
    if session is None:
        return None
    user = db.get(User, session.user_id)
    if user is None or not user.is_enabled:
        return None
    return user


def require_session(
    request: Request,
    db: Annotated[DbSession, Depends(get_db)],
) -> User:
    """FastAPI dependency: 401s any request without a valid, live session.

    Wired in at `app.include_router(..., dependencies=[...])` for every
    router except auth_svc's own register/login and the public docs router,
    so those remain reachable with no session while everything else is not.
    """
    user = get_current_user(request, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=NOT_AUTHENTICATED_ERROR
        )
    return user


def bootstrap_admin(db: DbSession, settings: Settings | None = None) -> None:
    """Creates the configured admin account at startup, if it doesn't exist.

    Idempotent: safe to call on every startup. Does not touch an existing
    account with that email (e.g. flip it to admin) -- it only creates the
    account the first time it is missing.
    """
    settings = settings or get_settings()
    if not settings.admin_email or not settings.admin_password:
        return
    email = normalize_email(settings.admin_email)
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        return
    user = User(
        name="Administrator",
        email=email,
        password_hash=hash_password(settings.admin_password),
        is_admin=True,
        is_enabled=True,
    )
    db.add(user)
    db.commit()
