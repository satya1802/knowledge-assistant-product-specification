"""Document Service routes (doc_svc).

Shared, open library: list with stats/search/filter, upload, the SSE status
stream, download and permanent delete. Upload creates the `Document` row
with status "processing" and hands the rest of the lifecycle to ingest_svc's
`ingest_document`, scheduled as a background task so the upload response
returns immediately; every status transition from there on is published to
`/api/documents/stream` by ingestion itself.
"""

from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import sessionmaker

from app.config import Settings, get_settings
from app.database import get_db
from app.models import Document, DocumentChunk, User
from app.object_store import LocalObjectStore, get_object_store
from app.services.auth import require_session
from app.services.extraction import CONTENT_TYPES, SUPPORTED_FILE_TYPES
from app.services.ingestion import ingest_document
from app.services.sse import get_document_broker

router = APIRouter(prefix="/api/documents", tags=["documents"])

logger = logging.getLogger(__name__)

DbSessionDep = Annotated[DbSession, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
ObjectStoreDep = Annotated[LocalObjectStore, Depends(get_object_store)]
CurrentUserDep = Annotated[User, Depends(require_session)]


def _file_type(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _parse_document_id(document_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(document_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        ) from exc


def _document_out(document: Document, uploader_name: str | None, chunk_count: int) -> dict:
    # The frontend's `DocumentRecord` contract (see frontend/src/lib/api.ts)
    # expects `uploaded_by` as a display name, not the raw `uploaded_by`
    # uuid column, and a `chunk_count` for the "N chunks indexed" caption --
    # both are resolved by the caller, which has the batch context (a join
    # or a precomputed map) needed to do it without an N+1 query per row.
    return {
        "id": str(document.id),
        "filename": document.filename,
        "file_type": document.file_type,
        "size_bytes": document.size_bytes,
        "status": document.status,
        "failure_reason": document.failure_reason,
        "uploaded_by": uploader_name or "Unknown",
        "uploaded_at": document.uploaded_at.isoformat(),
        "chunk_count": chunk_count,
    }


def _stats(documents: list[Document]) -> dict:
    return {
        "total": len(documents),
        "ready": sum(1 for d in documents if d.status == "ready"),
        "processing": sum(1 for d in documents if d.status == "processing"),
        "failed": sum(1 for d in documents if d.status == "failed"),
    }


def _uploader_names(db: DbSession, documents: list[Document]) -> dict[uuid.UUID, str]:
    user_ids = {d.uploaded_by for d in documents if d.uploaded_by is not None}
    if not user_ids:
        return {}
    rows = db.execute(select(User.id, User.name).where(User.id.in_(user_ids))).all()
    return {row[0]: row[1] for row in rows}


def _chunk_counts(db: DbSession, documents: list[Document]) -> dict[uuid.UUID, int]:
    doc_ids = [d.id for d in documents]
    if not doc_ids:
        return {}
    rows = db.execute(
        select(DocumentChunk.document_id, func.count(DocumentChunk.id))
        .where(DocumentChunk.document_id.in_(doc_ids))
        .group_by(DocumentChunk.document_id)
    ).all()
    return {row[0]: row[1] for row in rows}


@router.get("")
async def list_documents(
    db: DbSessionDep,
    settings: SettingsDep,
    q: str | None = None,
    status: str | None = None,
    type: str | None = None,
) -> dict:
    query = select(Document)
    if q:
        query = query.where(Document.filename.ilike(f"%{q}%"))
    if status:
        query = query.where(Document.status == status)
    if type:
        query = query.where(Document.file_type == type)

    documents = list(db.scalars(query.order_by(Document.uploaded_at.desc())).all())
    all_documents = list(db.scalars(select(Document)).all())

    uploader_names = _uploader_names(db, documents)
    chunk_counts = _chunk_counts(db, documents)

    return {
        "documents": [
            _document_out(
                d, uploader_names.get(d.uploaded_by) if d.uploaded_by else None, chunk_counts.get(d.id, 0)
            )
            for d in documents
        ],
        "stats": _stats(all_documents),
        "result_count": len(documents),
        "max_upload_bytes": settings.max_upload_mb * 1024 * 1024,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_documents(
    files: list[UploadFile],
    background_tasks: BackgroundTasks,
    db: DbSessionDep,
    settings: SettingsDep,
    store: ObjectStoreDep,
    user: CurrentUserDep,
) -> dict:
    """Validates type and size before anything is persisted (AC: doc_svc
    upload validation): a rejected file never becomes a `Document` row, it
    is only reported back in `rejected`, matching the approved contract
    `{ accepted: [...], rejected: [{name, reason}] }`.
    """
    max_bytes = settings.max_upload_mb * 1024 * 1024
    broker = get_document_broker()
    accepted: list[Document] = []
    rejected: list[dict] = []

    for upload in files:
        data = await upload.read()
        filename = upload.filename or "untitled"
        file_type = _file_type(filename)

        if file_type not in SUPPORTED_FILE_TYPES:
            rejected.append(
                {"name": filename, "reason": f"Unsupported file type: {file_type or 'unknown'}"}
            )
            continue
        if len(data) > max_bytes:
            rejected.append(
                {"name": filename, "reason": f"File exceeds the {settings.max_upload_mb} MB limit"}
            )
            continue

        document = Document(
            filename=filename,
            file_type=file_type,
            size_bytes=len(data),
            storage_key="",
            status="processing",
            uploaded_by=user.id,
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        broker.publish("document.status", _document_out(document, user.name, 0))

        storage_key = store.make_key(filename)
        store.save(storage_key, data)
        document.storage_key = storage_key
        db.add(document)
        db.commit()
        db.refresh(document)
        # Bound to this request's own engine (not necessarily the
        # process default -- tests override `get_db` onto a different
        # one) so the background task reads and writes the same
        # database the request did.
        session_factory = sessionmaker(bind=db.get_bind(), autoflush=False, expire_on_commit=False)
        background_tasks.add_task(
            ingest_document,
            str(document.id),
            object_store=store,
            session_factory=session_factory,
        )

        accepted.append(document)

    return {
        "accepted": [_document_out(d, user.name, 0) for d in accepted],
        "rejected": rejected,
    }


async def _event_stream() -> AsyncIterator[str]:
    broker = get_document_broker()
    async for payload in broker.stream():
        yield payload


@router.get("/stream")
async def stream_documents() -> StreamingResponse:
    return StreamingResponse(_event_stream(), media_type="text/event-stream")


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: DbSessionDep,
    store: ObjectStoreDep,
) -> Response:
    document = db.get(Document, _parse_document_id(document_id))
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    try:
        data = store.load(document.storage_key)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found") from exc

    content_type = CONTENT_TYPES.get(document.file_type, "application/octet-stream")

    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{document.filename}"'},
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def delete_document(
    document_id: str,
    db: DbSessionDep,
    store: ObjectStoreDep,
) -> None:
    document = db.get(Document, _parse_document_id(document_id))
    if document is None:
        return None

    if document.storage_key:
        store.delete(document.storage_key)
    db.delete(document)
    db.commit()
    get_document_broker().publish("document.deleted", {"id": document_id})
    return None
