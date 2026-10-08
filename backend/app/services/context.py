"""Conversation context assembly (chat_svc).

A follow-up like "what about the second one?" only makes sense next to the
turns before it. This module is the single place that turns a conversation's
prior turns plus the new question into (a) a retrieval query that carries
enough of the preceding subject for embedding search to find the right
chunks, and (b) a bounded block of prior turns to give the model as context
when it generates the answer.

`assemble_context` has a pure signature -- history in, question in, result
out -- so it is unit-testable with no database, no Gemini client and no
event loop. The one impure helper here, `load_recent_messages`, is a thin
synchronous DB read that the route calls through `asyncio.to_thread` so it
never blocks the event loop (AC-052).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session as DbSession

from app.models import Message

DEFAULT_HISTORY_CHAR_BUDGET = 4000


@dataclass(frozen=True)
class ConversationContext:
    """What `assemble_context` hands back to the route."""

    retrieval_query: str
    history_text: str


def assemble_context(
    history: list[tuple[str, str]],
    question: str,
    max_history_chars: int = DEFAULT_HISTORY_CHAR_BUDGET,
) -> ConversationContext:
    """Builds a retrieval query and a prompt-ready history block.

    `history` is `(role, content)` pairs in chronological order (oldest
    first) for the *same* conversation only -- the route never passes in
    turns from any other conversation (AC-053). Turns are kept from the
    newest backwards until `max_history_chars` would be exceeded, so the
    oldest turns are trimmed first and the current `question` -- passed
    separately and never trimmed -- always has room (AC-052).

    The retrieval query folds the kept history in front of the question so
    a pronoun or an elliptical follow-up ("what about the second one?")
    embeds alongside the subject the earlier turns established, instead of
    alone (AC-051).
    """
    question = (question or "").strip()

    kept: list[tuple[str, str]] = []
    total = 0
    for role, content in reversed(history):
        content = (content or "").strip()
        if not content:
            continue
        line = f"{role}: {content}"
        total += len(line) + 1
        if total > max_history_chars:
            break
        kept.append((role, content))
    kept.reverse()

    history_text = "\n".join(f"{role}: {content}" for role, content in kept)

    retrieval_query = f"{history_text}\nuser: {question}" if history_text else question

    return ConversationContext(retrieval_query=retrieval_query, history_text=history_text)


def load_recent_messages(
    db: DbSession,
    conversation_id: uuid.UUID,
    exclude_message_id: uuid.UUID | None = None,
) -> list[tuple[str, str]]:
    """Reads a conversation's prior turns, oldest first.

    Scoped to `conversation_id` alone: the caller (chat_svc's `ask`) only
    ever resolves a `Conversation` it has already checked belongs to the
    requesting user, so history can never cross conversations or users
    (AC-053). `exclude_message_id` leaves out the just-persisted user
    message for the current turn, which `assemble_context` receives as
    `question` instead.
    """
    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )
    return [(row.role, row.content) for row in rows if row.id != exclude_message_id]
