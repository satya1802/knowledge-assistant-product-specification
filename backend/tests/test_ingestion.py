"""Unit/integration tests for ingest_svc's ingest_document pipeline."""

from __future__ import annotations

import uuid

from app.models import Document, DocumentChunk
from app.object_store import LocalObjectStore
from app.services.ingestion import ingest_document
from app.services.sse import DocumentEventBroker


def _make_document(db, **overrides) -> Document:
    defaults = dict(
        filename="notes.txt",
        file_type="txt",
        size_bytes=100,
        storage_key="",
        status="processing",
    )
    defaults.update(overrides)
    document = Document(**defaults)
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def test_ingest_document_reaches_ready_and_persists_chunks(db_session_factory, tmp_path) -> None:
    session = db_session_factory()
    store = LocalObjectStore(root=tmp_path / "uploads")
    broker = DocumentEventBroker()

    key = store.make_key("notes.txt")
    store.save(key, b"This is a sentence about refund policy. " * 50)
    document = _make_document(session, storage_key=key)

    ingest_document(str(document.id), db=session, object_store=store, broker=broker)

    session.refresh(document)
    assert document.status == "ready"
    assert document.failure_reason is None

    chunks = (
        session.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).all()
    )
    assert len(chunks) >= 1
    for chunk in chunks:
        assert chunk.embedding is not None
        assert len(chunk.embedding) == 768


def test_ingest_document_publishes_ready_status(db_session_factory, tmp_path) -> None:
    session = db_session_factory()
    store = LocalObjectStore(root=tmp_path / "uploads")
    broker = DocumentEventBroker()
    q = broker.subscribe()

    key = store.make_key("notes.txt")
    store.save(key, b"Some real extractable text content here.")
    document = _make_document(session, storage_key=key)

    ingest_document(str(document.id), db=session, object_store=store, broker=broker)

    payload = q.get_nowait()
    assert "document.status" in payload
    assert '"ready"' in payload


def test_ingest_document_sets_failed_with_reason_for_no_text(db_session_factory, tmp_path) -> None:
    session = db_session_factory()
    store = LocalObjectStore(root=tmp_path / "uploads")
    broker = DocumentEventBroker()

    key = store.make_key("empty.txt")
    store.save(key, b"   ")
    document = _make_document(session, storage_key=key, filename="empty.txt")

    ingest_document(str(document.id), db=session, object_store=store, broker=broker)

    session.refresh(document)
    assert document.status == "failed"
    assert document.failure_reason == "No extractable text found"


def test_ingest_document_sets_failed_for_corrupt_pdf(db_session_factory, tmp_path) -> None:
    session = db_session_factory()
    store = LocalObjectStore(root=tmp_path / "uploads")
    broker = DocumentEventBroker()

    key = store.make_key("broken.pdf")
    store.save(key, b"not actually a pdf")
    document = _make_document(session, storage_key=key, filename="broken.pdf", file_type="pdf")

    ingest_document(str(document.id), db=session, object_store=store, broker=broker)

    session.refresh(document)
    assert document.status == "failed"
    assert "Corrupt" in document.failure_reason


def test_failed_ingestion_leaves_other_documents_and_chunks_untouched(
    db_session_factory, tmp_path
) -> None:
    session = db_session_factory()
    store = LocalObjectStore(root=tmp_path / "uploads")
    broker = DocumentEventBroker()

    good_key = store.make_key("good.txt")
    store.save(good_key, b"Perfectly good extractable text content.")
    good_document = _make_document(session, storage_key=good_key, filename="good.txt")
    ingest_document(str(good_document.id), db=session, object_store=store, broker=broker)
    session.refresh(good_document)
    assert good_document.status == "ready"
    good_chunk_count = (
        session.query(DocumentChunk)
        .filter(DocumentChunk.document_id == good_document.id)
        .count()
    )
    assert good_chunk_count >= 1

    bad_key = store.make_key("bad.txt")
    store.save(bad_key, b"   ")
    bad_document = _make_document(session, storage_key=bad_key, filename="bad.txt")
    ingest_document(str(bad_document.id), db=session, object_store=store, broker=broker)
    session.refresh(bad_document)
    assert bad_document.status == "failed"

    # The earlier, successful document and its chunks are untouched.
    session.refresh(good_document)
    assert good_document.status == "ready"
    assert (
        session.query(DocumentChunk)
        .filter(DocumentChunk.document_id == good_document.id)
        .count()
        == good_chunk_count
    )


def test_ingest_document_missing_file_in_store_fails_gracefully(db_session_factory, tmp_path) -> None:
    session = db_session_factory()
    store = LocalObjectStore(root=tmp_path / "uploads")
    broker = DocumentEventBroker()

    document = _make_document(session, storage_key="does-not-exist.txt")

    # Must not raise: every failure mode lands as status "failed".
    ingest_document(str(document.id), db=session, object_store=store, broker=broker)

    session.refresh(document)
    assert document.status == "failed"
    assert document.failure_reason


def test_ingest_document_unknown_id_is_a_no_op(db_session_factory, tmp_path) -> None:
    session = db_session_factory()
    store = LocalObjectStore(root=tmp_path / "uploads")
    broker = DocumentEventBroker()

    # Must not raise even for a document id that was never created.
    ingest_document(str(uuid.uuid4()), db=session, object_store=store, broker=broker)
