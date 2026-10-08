"""Conversation Service routes (conv_svc).

List/search, full thread and delete for the signed-in user's own private
conversations. `get_conversation` is the read side of chat_svc's persistence
contract (AC-041): it returns exactly what was streamed and saved, so
reopening a conversation shows byte-identical content. List and delete
remain scaffolded stubs; another ticket owns them.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.models import Conversation, Document, User
from app.schemas import CitationOut, ConversationDetail, MessageOut, StubResponse
from app.services.auth import require_session

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

DbSessionDep = Annotated[DbSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(require_session)]

_NOT_FOUND_ERROR = "Conversation not found."


@router.get("", response_model=list[StubResponse])
async def list_conversations(q: str | None = None) -> list[StubResponse]:
    return [StubResponse(endpoint="GET /api/conversations")]


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: DbSessionDep,
    user: CurrentUserDep,
) -> ConversationDetail:
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND_ERROR) from exc

    conversation = db.get(Conversation, conv_uuid)
    if conversation is None or conversation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND_ERROR)

    messages = sorted(conversation.messages, key=lambda m: m.created_at)

    def _citation_out(citation) -> CitationOut:
        # AC-050: a deleted document leaves the citation row intact (no
        # cross-table cascade from Document to MessageCitation), so this is
        # a plain lookup that returns None rather than erroring.
        document = db.get(Document, citation.document_id)
        return CitationOut(
            chip_number=citation.chip_number,
            document_id=str(citation.document_id),
            excerpt=citation.excerpt,
            document_filename=document.filename if document else None,
            document_file_type=document.file_type if document else None,
            document_size_bytes=document.size_bytes if document else None,
            document_uploaded_by=(
                str(document.uploaded_by) if document and document.uploaded_by else None
            ),
            document_uploaded_at=document.uploaded_at.isoformat() if document else None,
        )

    return ConversationDetail(
        id=str(conversation.id),
        title=conversation.title,
        messages=[
            MessageOut(
                id=str(message.id),
                role=message.role,
                content=message.content,
                is_general_knowledge=message.is_general_knowledge,
                citations=[
                    _citation_out(citation)
                    for citation in sorted(message.citations, key=lambda c: c.chip_number)
                ],
            )
            for message in messages
        ],
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(conversation_id: str) -> None:
    return None
