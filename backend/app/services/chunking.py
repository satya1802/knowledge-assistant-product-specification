"""Deterministic text chunking (ingest_svc).

A pure function over text: the same text and parameters always produce the
same list of chunks, with no I/O and no dependency on any external service,
so it is trivially unit-testable and safe to call from both ingestion and
tests without a database or network.
"""

from __future__ import annotations

DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 150

_BOUNDARY_SEPARATORS = ("\n\n", ". ", "\n", " ")


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    """Splits `text` into overlapping chunks of at most `chunk_size` characters.

    Prefers to break at a paragraph, sentence or word boundary near the
    target size rather than mid-word, and keeps `chunk_overlap` characters of
    context between consecutive chunks so a fact split across a boundary is
    still findable by similarity search in at least one chunk.
    """
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be non-negative and smaller than chunk_size")

    normalized = text.strip()
    if not normalized:
        return []

    chunks: list[str] = []
    start = 0
    length = len(normalized)

    while start < length:
        end = min(start + chunk_size, length)
        if end < length:
            boundary = _find_boundary(normalized, start, end)
            if boundary > start:
                end = boundary

        piece = normalized[start:end].strip()
        if piece:
            chunks.append(piece)

        if end >= length:
            break
        start = max(end - chunk_overlap, start + 1)

    return chunks


def _find_boundary(text: str, start: int, end: int) -> int:
    window = text[start:end]
    for separator in _BOUNDARY_SEPARATORS:
        idx = window.rfind(separator)
        if idx > 0:
            return start + idx + len(separator)
    return end
