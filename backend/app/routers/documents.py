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
from sqlalchemy import select
from sqlalchemy.orm import Session as DbSession
from sqlalchemy.orm import sessionmaker

from app.config import Settings, get_settings
from app.database import get_db
from app.models import Document
from app.object_store import LocalObjectStore, get_object_store
from app.services.extraction import SUPPORTED_FILE_TYPES
from app.services.ingestion import ingest_document
from app.services.sse import get_document_broker

router = APIRouter(prefix="/api/documents", tags=["documents"])

logger = logging.getLogger(__name__)

DbSessionDep = Annotated[DbSession, Depends(get_db)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
ObjectStoreDep = Annotated[LocalObjectStore, Depends(get_object_store)]


def _file_type(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _parse_document_id(document_id: str) -> uuid.UUID:
    try:
        return uuid.UUID(document_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        ) from exc


def _document_out(document: Document) -> dict:
    return {
        "id": str(document.id),
        "filename": document.filename,
        "file_type": document.file_type,
        "size_bytes": document.size_bytes,
        "status": document.status,
        "failure_reason": document.failure_reason,
        "uploaded_at": document.uploaded_at.isoformat(),
    }


def _stats(documents: list[Document]) -> dict:
    return {
        "total": len(documents),
        "ready": sum(1 for d in documents if d.status == "ready"),
        "processing": sum(1 for d in documents if d.status == "processing"),
        "failed": sum(1 for d in documents if d.status == "failed"),
    }


@router.get("")
async def list_documents(
    db: DbSessionDep,
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

    return {"documents": [_document_out(d) for d in documents], "stats": _stats(all_documents)}


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_documents(
    files: list[UploadFile],
    background_tasks: BackgroundTasks,
    db: DbSessionDep,
    settings: SettingsDep,
    store: ObjectStoreDep,
) -> dict:
    max_bytes = settings.max_upload_mb * 1024 * 1024
    broker = get_document_broker()
    created: list[Document] = []

    for upload in files:
        data = await upload.read()
        file_type = _file_type(upload.filename or "")

        document = Document(
            filename=upload.filename or "untitled",
            file_type=file_type,
            size_bytes=len(data),
            storage_key="",
            status="processing",
        )

        if file_type not in SUPPORTED_FILE_TYPES:
            document.status = "failed"
            document.failure_reason = f"Unsupported file type: {file_type or 'unknown'}"
        elif len(data) > max_bytes:
            document.status = "failed"
            document.failure_reason = f"File exceeds the {settings.max_upload_mb} MB limit"

        db.add(document)
        db.commit()
        db.refresh(document)
        broker.publish("document.status", _document_out(document))

        if document.status == "processing":
            storage_key = store.make_key(upload.filename or "upload")
            store.save(storage_key, data)
            document.storage_key = storage_key
            db.add(document)
            db.commit()
            db.refresh(document)
            # Bound to this request's own engine (not necessarily the
            # process default -- tests override `get_db` onto a different
            # one) so the background task reads and writes the same
            # database the request did.
            session_factory = sessionmaker(
                bind=db.get_bind(), autoflush=False, expire_on_commit=False
            )
            background_tasks.add_task(
                ingest_document,
                str(document.id),
                object_store=store,
                session_factory=session_factory,
            )

        created.append(document)

    return {"documents": [_document_out(d) for d in created]}


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

    return Response(
        content=data,
        media_type="application/octet-stream",
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
