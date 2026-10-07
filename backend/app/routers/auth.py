"""Auth & Session Service routes (auth_svc).

Registration, login, logout, session bootstrap and self password change.
Every handler here is a scaffolded stub: it validates the request shape
against the approved API spec and returns a typed placeholder so the
OpenAPI document is complete before auth_svc's real behaviour -- password
hashing, session cookies, lockout -- is implemented.
"""

from fastapi import APIRouter, status

from app.schemas import ChangePasswordRequest, LoginRequest, RegisterRequest, StubResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=StubResponse)
async def register(payload: RegisterRequest) -> StubResponse:
    return StubResponse(endpoint="POST /api/auth/register")


@router.post("/login", response_model=StubResponse)
async def login(payload: LoginRequest) -> StubResponse:
    return StubResponse(endpoint="POST /api/auth/login")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> None:
    return None


@router.get("/me", response_model=StubResponse)
async def me() -> StubResponse:
    return StubResponse(endpoint="GET /api/auth/me")


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(payload: ChangePasswordRequest) -> None:
    return None
