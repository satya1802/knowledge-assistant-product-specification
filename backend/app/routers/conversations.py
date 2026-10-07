"""Conversation Service routes (conv_svc).

List/search, full thread and delete for the signed-in user's own private
conversations. Every handler here is a scaffolded stub; per-user ownership
enforcement and persistence are the development sprint's work.
"""

from fastapi import APIRouter, status

from app.schemas import StubResponse

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=list[StubResponse])
async def list_conversations(q: str | None = None) -> list[StubResponse]:
    return [StubResponse(endpoint="GET /api/conversations")]


@router.get("/{conversation_id}", response_model=StubResponse)
async def get_conversation(conversation_id: str) -> StubResponse:
    return StubResponse(endpoint="GET /api/conversations/{id}")


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str) -> None:
    return None
