"""Auth & Session Service routes (auth_svc).

Registration, login, logout, session bootstrap and self password change.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session as DbSession

from app.config import Settings, get_settings
from app.database import get_db
from app.models import User
from app.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    UserOut,
)
from app.services.auth import (
    GENERIC_LOGIN_ERROR,
    GENERIC_REGISTER_ERROR,
    REGISTRATION_DISABLED_ERROR,
    clear_session_cookie,
    create_session,
    get_current_user,
    hash_password,
    is_locked_out,
    normalize_email,
    record_login_attempt,
    require_session,
    reset_login_attempts,
    revoke_session,
    set_session_cookie,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

DbSessionDep = Annotated[DbSession, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
CurrentUserDep = Annotated[User, Depends(require_session)]


def _user_out(user: User) -> UserOut:
    return UserOut(id=str(user.id), name=user.name, email=user.email, is_admin=user.is_admin)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    db: DbSessionDep,
    settings: SettingsDep,
) -> UserOut:
    if not settings.self_registration_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=REGISTRATION_DISABLED_ERROR
        )

    if len(payload.password) < settings.min_password_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Password must be at least {settings.min_password_length} characters.",
        )

    email = normalize_email(payload.email)
    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=GENERIC_REGISTER_ERROR)

    is_first_user = db.query(User).count() == 0
    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        is_admin=is_first_user,
        is_enabled=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    session = create_session(db, user, settings)
    set_session_cookie(response, session, settings)

    return _user_out(user)


@router.post("/login", response_model=UserOut)
async def login(
    payload: LoginRequest,
    response: Response,
    db: DbSessionDep,
    settings: SettingsDep,
) -> UserOut:
    email = normalize_email(payload.email)

    if is_locked_out(db, email, settings):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    user = db.query(User).filter(User.email == email).first()

    if (
        user is None
        or not user.is_enabled
        or not verify_password(payload.password, user.password_hash)
    ):
        record_login_attempt(db, email, succeeded=False)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    record_login_attempt(db, email, succeeded=True)
    reset_login_attempts(db, email)

    session = create_session(db, user, settings)
    set_session_cookie(response, session, settings)

    return _user_out(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: DbSessionDep,
    settings: SettingsDep,
    _user: CurrentUserDep,
) -> None:
    session_id = request.cookies.get(settings.session_cookie_name)
    if session_id:
        revoke_session(db, session_id)
    clear_session_cookie(response, settings)
    return None


@router.get("/me", response_model=MeResponse)
async def me(
    request: Request,
    db: DbSessionDep,
    settings: SettingsDep,
) -> MeResponse:
    user = get_current_user(request, db)
    return MeResponse(
        user=_user_out(user) if user else None,
        self_registration_enabled=settings.self_registration_enabled,
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    _user: CurrentUserDep,
) -> None:
    # Change-password ships in KNOW1307CB-12-1; this endpoint only enforces
    # that a caller is signed in until that ticket implements the behaviour.
    return None
