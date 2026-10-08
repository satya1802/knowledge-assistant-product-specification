"""Conversation Service routes (conv_svc).

List/search, full thread and delete for the signed-in user's own private
conversations. `get_conversation` is the read side of chat_svc's persistence
contract (AC-041): it returns exactly what was streamed and saved, so
reopening a conversation shows byte-identical content. `list_conversations`
and `delete_conversation` are the write/read sides of the same private
history: a user only ever sees or removes their own conversations.
"""

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession

from app.database import get_db
from app.models import Conversation, Document, Message, User
from app.schemas import CitationOut, ConversationDetail, ConversationSummary, MessageOut
from app.services.auth import require_session

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

DbSessionDep = Annotated[DbSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(require_session)]

_NOT_FOUND_ERROR = "Conversation not found."


def _conversation_updated_at(conversation: Conversation) -> datetime:
    """The latest activity time for a conversation: the newest message's
    `created_at`, or the conversation's own `updated_at` when it has no
    messages yet (e.g. the brief window before the first answer lands)."""
    latest = conversation.updated_at
    for message in conversation.messages:
        if message.created_at > latest:
            latest = message.created_at
    return latest


def _parse_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND_ERROR) from exc


@router.get("", response_model=list[ConversationSummary])
async def list_conversations(
    db: DbSessionDep,
    user: CurrentUserDep,
    q: str | None = None,
) -> list[ConversationSummary]:
    query = db.query(Conversation).filter(Conversation.user_id == user.id)

    term = q.strip() if q else ""
    if term:
        pattern = f"%{term}%"
        matching_conversation_ids = select(Message.conversation_id).where(
            Message.content.ilike(pattern)
        )
        query = query.filter(
            (Conversation.title.ilike(pattern)) | (Conversation.id.in_(matching_conversation_ids))
        )

    conversations = query.all()

    summaries = [
        ConversationSummary(
            id=str(conversation.id),
            title=conversation.title,
            created_at=conversation.created_at,
            updated_at=_conversation_updated_at(conversation),
        )
        for conversation in conversations
    ]
    summaries.sort(key=lambda c: c.updated_at, reverse=True)
    return summaries


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: DbSessionDep,
    user: CurrentUserDep,
) -> ConversationDetail:
    conv_uuid = _parse_uuid(conversation_id)

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
        updated_at=_conversation_updated_at(conversation),
        messages=[
            MessageOut(
                id=str(message.id),
                role=message.role,
                content=message.content,
                is_general_knowledge=message.is_general_knowledge,
                created_at=message.created_at,
                citations=[
                    _citation_out(citation)
                    for citation in sorted(message.citations, key=lambda c: c.chip_number)
                ],
            )
            for message in messages
        ],
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: DbSessionDep,
    user: CurrentUserDep,
) -> None:
    conv_uuid = _parse_uuid(conversation_id)

    conversation = db.get(Conversation, conv_uuid)
    if conversation is None or conversation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND_ERROR)

    db.delete(conversation)
    db.commit()
    return None
