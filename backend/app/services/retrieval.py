"""Grounded-chunk retrieval for chat_svc.

Embeds the question with the same `GeminiClient` ingest_svc used to embed
chunks, then ranks every chunk belonging to a "ready" document by cosine
similarity, returning the ones at or above `relevance_threshold`.

Deleted documents are excluded for free: `Document.chunks` cascades on
delete (see `app/models.py`), so a deleted document's rows are gone from
`document_chunks` entirely -- there is nothing here that could ever
surface one (shares AC-036 with the document-delete endpoint).
"""

from __future__ import annotations

from sqlalchemy.orm import Session as DbSession

from app.config import Settings, get_settings
from app.models import Document, DocumentChunk
from app.services.gemini import GeminiClient


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def retrieve_chunks(
    db: DbSession,
    question: str,
    client: GeminiClient,
    settings: Settings | None = None,
    top_k: int = 5,
) -> list[DocumentChunk]:
    """Returns up to `top_k` chunks from ready documents, most relevant first.

    Returns an empty list when nothing clears `relevance_threshold` -- the
    caller treats that as an unanswerable-from-the-knowledge-base question
    and falls back to general knowledge.
    """
    settings = settings or get_settings()
    query_embedding = client.embed(question)

    rows = (
        db.query(DocumentChunk)
        .join(Document, DocumentChunk.document_id == Document.id)
        .filter(Document.status == "ready")
        .all()
    )

    scored = [
        (_cosine_similarity(query_embedding, list(chunk.embedding or [])), chunk)
        for chunk in rows
    ]
    scored = [(score, chunk) for score, chunk in scored if score >= settings.relevance_threshold]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]
