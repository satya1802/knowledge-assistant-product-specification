"""Server-Sent Events broker for the knowledge base document stream.

Single-process, in-memory pub/sub: every client connected to
`GET /api/documents/stream` gets its own thread-safe queue, and anything in
the process -- the upload handler, the ingestion pipeline -- calls
`publish()` to push a status event onto every connected queue.

`queue.Queue` (not `asyncio.Queue`) is used deliberately: ingestion can run
on a background thread via FastAPI's `BackgroundTasks` (`run_in_threadpool`
for a sync callable), so `publish()` has to be safe to call from a thread
that is not running the event loop. The async `stream()` generator polls its
queue in a thread-pool executor so it never blocks the loop.
"""

from __future__ import annotations

import asyncio
import json
import queue
import threading
from collections.abc import AsyncIterator
from typing import Any

_KEEPALIVE_SECONDS = 15.0
KEEPALIVE_COMMENT = ": keep-alive\n\n"


def format_event(event: str, data: dict[str, Any]) -> str:
    """One SSE-formatted event; the single place an event's wire shape is
    assembled, shared by the document broker and chat_svc's token stream."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def drain_with_keepalive(
    q: queue.Queue[Any],
    done: object,
    keepalive_seconds: float = _KEEPALIVE_SECONDS,
) -> AsyncIterator[Any]:
    """Pulls items from `q` until the `done` sentinel appears, yielding
    `KEEPALIVE_COMMENT` whenever the queue has been empty for
    `keepalive_seconds`.

    This is the one SSE keep-alive implementation in the app: the document
    status stream and chat_svc's token stream both poll a `queue.Queue` (safe
    to publish onto from a background thread that isn't running the event
    loop) in a thread-pool executor so neither blocks the loop, and both get
    a keep-alive comment instead of a dropped connection while nothing new
    has arrived.
    """
    loop = asyncio.get_event_loop()
    while True:
        try:
            item = await loop.run_in_executor(None, lambda: q.get(timeout=keepalive_seconds))
        except queue.Empty:
            yield KEEPALIVE_COMMENT
            continue
        if item is done:
            return
        yield item


class DocumentEventBroker:
    """Fans a published event out to every currently-connected subscriber."""

    def __init__(self) -> None:
        self._subscribers: set[queue.Queue[str]] = set()
        self._lock = threading.Lock()

    def subscribe(self) -> queue.Queue[str]:
        q: queue.Queue[str] = queue.Queue()
        with self._lock:
            self._subscribers.add(q)
        return q

    def unsubscribe(self, q: queue.Queue[str]) -> None:
        with self._lock:
            self._subscribers.discard(q)

    def publish(self, event: str, data: dict[str, Any]) -> None:
        """Pushes one SSE-formatted event onto every connected subscriber."""
        payload = format_event(event, data)
        with self._lock:
            subscribers = list(self._subscribers)
        for q in subscribers:
            q.put(payload)

    async def stream(self) -> AsyncIterator[str]:
        """An async generator a route can hand straight to `StreamingResponse`."""
        q = self.subscribe()
        # This stream never ends on its own (a connected client just keeps
        # listening), so `done` is a sentinel `publish()` never sends.
        never_done = object()
        try:
            async for item in drain_with_keepalive(q, never_done):
                yield item
        finally:
            self.unsubscribe(q)


_default_broker: DocumentEventBroker | None = None


def get_document_broker() -> DocumentEventBroker:
    """One broker per process, shared by the upload handler, ingestion and
    the stream route."""
    global _default_broker
    if _default_broker is None:
        _default_broker = DocumentEventBroker()
    return _default_broker
