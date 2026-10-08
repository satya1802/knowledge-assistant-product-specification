"""Ingestion pipeline (ingest_svc).

`ingest_document(document_id)` is the sole entrypoint and matches the
contract handed to doc_svc's upload handler: called after a file is saved
and a `Document` row exists with status "processing", it extracts text,
chunks it, embeds each chunk via `GeminiClient.embed` (the only place
embeddings are produced -- the API key and model name stay inside
`app.services.gemini`), persists `DocumentChunk` rows and drives the
document to "ready".

It never raises out of itself: every failure mode -- corrupt file,
password-protected file, no extractable text, an embedding call that
errors, a missing file in the object store -- is caught here and turned
into status "failed" with a short, human-readable `failure_reason`, leaving
every other document and its chunks untouched. Every status transition is
published to the shared SSE broker so a connected `/api/documents/stream`
client updates with no manual refresh.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import Callable

from sqlalchemy.orm import Session as DbSession

from app.database import SessionLocal
from app.models import Document, DocumentChunk
from app.object_store import LocalObjectStore, get_object_store
from app.services.chunking import chunk_text
from app.services.extraction import ExtractionError, extract_text
from app.services.gemini import GeminiClient, get_gemini_client
from app.services.sse import DocumentEventBroker, get_document_broker

logger = logging.getLogger(__name__)


def _document_event(document: Document) -> dict:
    return {
        "id": str(document.id),
        "filename": document.filename,
        "status": document.status,
        "failure_reason": document.failure_reason,
    }


def _publish(broker: DocumentEventBroker, document: Document) -> None:
    broker.publish("document.status", _document_event(document))


def _mark_failed(
    db: DbSession, document: Document, reason: str, broker: DocumentEventBroker
) -> None:
    db.rollback()
    # Re-fetch: the failed attempt above may have added chunk rows to the
    # session that rollback() just discarded; querying fresh avoids acting
    # on a stale, half-flushed object.
    fresh = db.get(Document, document.id)
    if fresh is None:
        return
    fresh.status = "failed"
    fresh.failure_reason = reason
    db.add(fresh)
    db.commit()
    db.refresh(fresh)
    _publish(broker, fresh)


def ingest_document(
    document_id: str,
    db: DbSession | None = None,
    object_store: LocalObjectStore | None = None,
    gemini_client: GeminiClient | None = None,
    broker: DocumentEventBroker | None = None,
    session_factory: Callable[[], DbSession] | None = None,
) -> None:
    """Drives one document from "processing" to "ready" or "failed".

    Opens and closes its own session by default, since it is normally run
    from a `BackgroundTasks` callback after the request's own session has
    already closed. `session_factory` lets a caller (doc_svc's upload
    handler, or a test) bind that fresh session to a specific engine instead
    of the process-wide default -- e.g. a request bound to a test database --
    while `db` lets a caller that already holds an open session (tests) pass
    it straight through and keep owning its lifecycle.
    """
    owns_session = db is None
    make_session = session_factory or SessionLocal
    session = db or make_session()
    store = object_store or get_object_store()
    client = gemini_client or get_gemini_client()
    event_broker = broker or get_document_broker()

    try:
        try:
            doc_uuid = uuid.UUID(str(document_id))
        except ValueError:
            return

        document = session.get(Document, doc_uuid)
        if document is None:
            return

        try:
            data = store.load(document.storage_key)
            text = extract_text(data, document.file_type)
            chunks = chunk_text(text)
            if not chunks:
                raise ExtractionError("No extractable text found")

            # Clear any chunks left from a previous failed attempt before
            # writing the fresh set.
            session.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()

            for index, chunk in enumerate(chunks):
                embedding = client.embed(chunk)
                session.add(
                    DocumentChunk(
                        document_id=document.id,
                        chunk_index=index,
                        content=chunk,
                        embedding=embedding,
                    )
                )

            document.status = "ready"
            document.failure_reason = None
            session.add(document)
            session.commit()
            session.refresh(document)
            _publish(event_broker, document)

        except ExtractionError as exc:
            _mark_failed(session, document, str(exc), event_broker)
        except FileNotFoundError:
            _mark_failed(session, document, "Stored file could not be found", event_broker)
        except Exception:
            # Catch-all: ingestion must never raise out of the background
            # task or the request handler, whatever goes wrong.
            logger.exception("ingestion failed unexpectedly for document %s", document_id)
            _mark_failed(session, document, "Ingestion failed unexpectedly", event_broker)
    finally:
        if owns_session:
            session.close()
