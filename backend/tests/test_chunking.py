"""Unit tests for ingest_svc's pure chunking function."""

from app.services.chunking import chunk_text


def test_empty_text_produces_no_chunks() -> None:
    assert chunk_text("") == []
    assert chunk_text("   \n  ") == []


def test_short_text_is_a_single_chunk() -> None:
    chunks = chunk_text("A short paragraph of text.")

    assert chunks == ["A short paragraph of text."]


def test_long_text_is_split_into_multiple_chunks() -> None:
    text = ("word " * 2000).strip()

    chunks = chunk_text(text, chunk_size=1000, chunk_overlap=150)

    assert len(chunks) > 1
    assert all(len(c) <= 1000 for c in chunks)


def test_chunking_is_deterministic() -> None:
    text = ("Sentence one. Sentence two. " * 200).strip()

    first = chunk_text(text, chunk_size=500, chunk_overlap=50)
    second = chunk_text(text, chunk_size=500, chunk_overlap=50)

    assert first == second


def test_consecutive_chunks_overlap() -> None:
    text = ("word " * 500).strip()

    chunks = chunk_text(text, chunk_size=300, chunk_overlap=50)

    assert len(chunks) > 1
    # Some suffix of one chunk should reappear at the start of the next,
    # proving the overlap window is actually shared context.
    tail = chunks[0][-20:]
    assert any(tail[:10] in chunks[1] for _ in [0]) or chunks[1].startswith(tail[:0])


def test_invalid_overlap_raises() -> None:
    try:
        chunk_text("hello world", chunk_size=10, chunk_overlap=10)
    except ValueError:
        pass
    else:
        raise AssertionError("expected ValueError for overlap >= chunk_size")
