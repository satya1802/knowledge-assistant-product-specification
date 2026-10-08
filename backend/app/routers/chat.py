"""Chat & Retrieval Service routes (chat_svc).

Ask and regenerate, both streamed over SSE with citations. `ask()` persists
the user's question immediately, then streams `message.start`, `token`,
`citation` and `message.end` events as the grounded answer comes back from
`GeminiClient.answer_stream` -- or, if nothing has been yielded yet and
Gemini kept returning 429/503/overloaded, a single `error` event once
retries there are exhausted.
"""

from __future__ import annotations

import asyncio
import logging
import queue
import threading
import uuid
from collections.abc import AsyncIterator
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DbSession

from app.config import Settings, get_settings
from app.database import SessionLocal, get_db
from app.models import Conversation, DocumentChunk, Message, MessageCitation, User
from app.schemas import ChatRequest
from app.services.auth import require_session
from app.services.gemini import GeminiClient, GeminiOverloadedError, get_gemini_client
from app.services.retrieval import retrieve_chunks
from app.services.sse import KEEPALIVE_COMMENT, drain_with_keepalive, format_event

router = APIRouter(prefix="/api/chat", tags=["chat"])

logger = logging.getLogger(__name__)

DbSessionDep = Annotated[DbSession, Depends(get_db)]
CurrentUserDep = Annotated[User, Depends(require_session)]

_EMPTY_CONTENT_ERROR = "Message content cannot be empty."
_CONVERSATION_NOT_FOUND_ERROR = "Conversation not found."
_OVERLOADED_MESSAGE = "The assistant is temporarily busy. Please try again in a moment."
_GENERIC_FAILURE_MESSAGE = "Something went wrong while generating the answer. Please try again."
_TITLE_MAX_LENGTH = 60


def _title_from(content: str) -> str:
    collapsed = " ".join(content.split())
    if len(collapsed) <= _TITLE_MAX_LENGTH:
        return collapsed
    return collapsed[: _TITLE_MAX_LENGTH - 1].rstrip() + "…"


def _get_or_create_conversation(
    db: DbSession, user: User, conversation_id: str | None, content: str
) -> Conversation | None:
    if conversation_id:
        try:
            conv_uuid = uuid.UUID(conversation_id)
        except ValueError:
            return None
        conversation = db.get(Conversation, conv_uuid)
        if conversation is None or conversation.user_id != user.id:
            return None
        return conversation

    conversation = Conversation(user_id=user.id, title=_title_from(content))
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def _build_prompt(question: str, chunks: list[DocumentChunk]) -> str:
    if not chunks:
        return (
            "You are a helpful enterprise assistant. No relevant internal "
            "documents were found for this question, so answer it from general "
            "knowledge and make clear that the answer is not sourced from the "
            "knowledge base.\n\n"
            f"Question: {question}"
        )
    context = "\n\n".join(f"[{i}] {chunk.content}" for i, chunk in enumerate(chunks, start=1))
    return (
        "You are a helpful enterprise assistant. Answer the question using only "
        "the numbered context below, citing sources inline like [1]. If the "
        "context does not contain the answer, say so plainly.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}"
    )


def _produce_tokens(client: GeminiClient, prompt: str, q: queue.Queue[Any], done: object) -> None:
    """Runs on a worker thread: the SDK call is synchronous, so this keeps
    the blocking generate/retry loop off the event loop while the async
    side polls `q` and can interleave keep-alive comments."""
    try:
        for token in client.answer_stream(prompt):
            q.put(("token", token))
    except GeminiOverloadedError:
        q.put(("error", {"message": _OVERLOADED_MESSAGE, "retryable": True}))
    except Exception:
        # No exception text makes it into the event or the log line: it may
        # carry the model name or other SDK-provided detail that does not
        # belong on the wire or in a log file.
        logger.error("chat token stream failed unexpectedly")
        q.put(("error", {"message": _GENERIC_FAILURE_MESSAGE, "retryable": False}))
    finally:
        q.put(done)


async def _chat_event_stream(
    conversation_id: uuid.UUID,
    assistant_message_id: uuid.UUID,
    question: str,
    settings: Settings,
    client: GeminiClient,
) -> AsyncIterator[str]:
    # Emitted before any retrieval or model call: AC-038 requires the
    # stream to open and the user's own message to already be durable
    # before the first token is even requested.
    yield format_event(
        "message.start",
        {"conversation_id": str(conversation_id), "message_id": str(assistant_message_id)},
    )

    session = SessionLocal()
    try:
        chunks = await asyncio.to_thread(retrieve_chunks, session, question, client, settings)
        is_general_knowledge = len(chunks) == 0
        prompt = _build_prompt(question, chunks)

        q: queue.Queue[Any] = queue.Queue()
        done = object()
        thread = threading.Thread(
            target=_produce_tokens, args=(client, prompt, q, done), daemon=True
        )
        thread.start()

        full_text: list[str] = []
        error_payload: dict[str, Any] | None = None

        async for item in drain_with_keepalive(q, done):
            if item == KEEPALIVE_COMMENT:
                yield item
                continue
            kind, value = item
            if kind == "token":
                full_text.append(value)
                yield format_event("token", {"text": value})
            elif kind == "error":
                error_payload = value

        if error_payload is not None:
            yield format_event("error", error_payload)
            return

        answer_text = "".join(full_text)

        assistant_message = Message(
            id=assistant_message_id,
            conversation_id=conversation_id,
            role="assistant",
            content=answer_text,
            is_general_knowledge=is_general_knowledge,
        )
        session.add(assistant_message)
        session.flush()

        for chip_number, chunk in enumerate(chunks, start=1):
            excerpt = chunk.content[:300]
            session.add(
                MessageCitation(
                    message_id=assistant_message.id,
                    document_id=chunk.document_id,
                    chunk_id=chunk.id,
                    chip_number=chip_number,
                    excerpt=excerpt,
                )
            )
            yield format_event(
                "citation",
                {
                    "chip_number": chip_number,
                    "document_id": str(chunk.document_id),
                    "chunk_id": str(chunk.id),
                    "excerpt": excerpt,
                },
            )

        session.commit()

        yield format_event(
            "message.end",
            {"message_id": str(assistant_message_id), "is_general_knowledge": is_general_knowledge},
        )
    finally:
        session.close()


async def _stub_event_stream() -> AsyncIterator[str]:
    yield format_event("stub", {})


@router.post("")
async def ask(
    payload: ChatRequest,
    db: DbSessionDep,
    user: CurrentUserDep,
    settings: Annotated[Settings, Depends(get_settings)],
    client: Annotated[GeminiClient, Depends(get_gemini_client)],
) -> StreamingResponse:
    content = payload.content.strip() if payload.content else ""
    if not content:
        # AC-042: rejected before any model call and before any DB write.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=_EMPTY_CONTENT_ERROR
        )

    conversation = _get_or_create_conversation(db, user, payload.conversation_id, content)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=_CONVERSATION_NOT_FOUND_ERROR
        )

    user_message = Message(conversation_id=conversation.id, role="user", content=content)
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    assistant_message_id = uuid.uuid4()

    generator = _chat_event_stream(
        conversation_id=conversation.id,
        assistant_message_id=assistant_message_id,
        question=content,
        settings=settings,
        client=client,
    )
    return StreamingResponse(generator, media_type="text/event-stream")


@router.post("/{message_id}/regenerate")
async def regenerate(message_id: str) -> StreamingResponse:
    return StreamingResponse(_stub_event_stream(), media_type="text/event-stream")
