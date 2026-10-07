"""Chat & Retrieval Service routes (chat_svc).

Ask and regenerate, both streamed over SSE with citations. Every handler
here is a scaffolded stub; retrieval, grounded-prompt assembly, the Gemini
stream itself, keep-alive pings and retry-on-overload are the development
sprint's work.
"""

from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas import ChatRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _stub_event_stream() -> AsyncIterator[str]:
    # Real handler streams answer tokens, keep-alive comments, then a
    # citations event and a done event; this stub emits one placeholder
    # event so the connection is well-formed SSE and then closes.
    yield "event: stub\ndata: {}\n\n"


@router.post("")
async def ask(payload: ChatRequest) -> StreamingResponse:
    return StreamingResponse(_stub_event_stream(), media_type="text/event-stream")


@router.post("/{message_id}/regenerate")
async def regenerate(message_id: str) -> StreamingResponse:
    return StreamingResponse(_stub_event_stream(), media_type="text/event-stream")
