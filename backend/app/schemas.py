"""Pydantic request and response models.

One request model per endpoint in the approved API spec that takes a JSON
body, so FastAPI validates shape and generates an accurate OpenAPI document
from day one, plus the placeholder every generated route returns until it
has been implemented.
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class StubResponse(BaseModel):
    """What a generated route returns until someone implements it.

    A stub that returns a typed body rather than raising keeps the service
    startable and its OpenAPI document complete, so the frontend can be built
    against the agreed shape while the handlers are still being written.
    """

    endpoint: str
    status: str = "not_implemented"
    detail: str = "Scaffolded from the approved API spec; no behaviour yet."


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

    model_config = {"from_attributes": True}


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
