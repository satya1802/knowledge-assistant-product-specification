"""Pydantic request and response models.

One request model per endpoint in the approved API spec that takes a JSON
body, so FastAPI validates shape and generates an accurate OpenAPI document
from day one, plus the placeholder every generated route returns until it
has been implemented.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# --- auth_svc ----------------------------------------------------------


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=1)
    confirm_password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    is_admin: bool
    is_enabled: bool = True

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    """What `/api/auth/register` and `/api/auth/login` return.

    The approved contract wraps the user in a `user` key (matching
    `MeResponse` below, which the SPA's `useAuth()` reads the same way after
    sign-in as it does on first load) rather than returning the user object
    bare -- the frontend's `AuthProvider` only ever reads `res.user`.
    """

    user: UserOut


class MeResponse(BaseModel):
    user: UserOut | None
    self_registration_enabled: bool


class ChangePasswordResponse(BaseModel):
    detail: str


# --- chat_svc ------------------------------------------------------------


class ChatRequest(BaseModel):
    conversation_id: str | None = None
    content: str = Field(min_length=0)


# --- conv_svc --------------------------------------------------------------


class CitationOut(BaseModel):
    chip_number: int
    document_id: str
    excerpt: str
    document_filename: str | None = None
    document_file_type: str | None = None
    document_size_bytes: int | None = None
    document_uploaded_by: str | None = None
    document_uploaded_at: str | None = None

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    is_general_knowledge: bool
    created_at: datetime
    citations: list[CitationOut]

    model_config = {"from_attributes": True}


class ConversationDetail(BaseModel):
    id: str
    title: str
    updated_at: datetime
    messages: list[MessageOut]


class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- doc content (api_gateway) ------------------------------------------


class DocsContentResponse(BaseModel):
    """Content backing an in-app documentation screen.

    `markdown` is always a static string this service itself owns -- never
    anything sourced from `Settings` -- so there is no path by which a
    secret (e.g. the Gemini API key) could end up rendered here.
    """

    markdown: str
