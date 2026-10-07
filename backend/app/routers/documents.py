"""Document Service routes (doc_svc).

Shared, open library: list with stats/search/filter, upload, the SSE status
stream, download and permanent delete. Every handler here is a scaffolded
stub returning a typed placeholder; doc_svc's real validation, storage and
deletion behaviour is the development sprint's work.
"""

from collections.abc import AsyncIterator

from fastapi import APIRouter, UploadFile, status
from fastapi.responses import StreamingResponse

from app.schemas import StubResponse

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=StubResponse)
async def list_documents(
    q: str | None = None, status: str | None = None, type: str | None = None
) -> StubResponse:
    return StubResponse(endpoint="GET /api/documents")


@router.post("", response_model=StubResponse)
async def upload_documents(files: list[UploadFile]) -> StubResponse:
    return StubResponse(endpoint="POST /api/documents")


async def _stub_event_stream() -> AsyncIterator[str]:
    # Real handler emits one SSE event per status/stats change plus periodic
    # `: keep-alive` comments; this stub emits a single placeholder event so
    # the connection is well-formed SSE and then closes.
    yield "event: stub\ndata: {}\n\n"


@router.get("/stream")
async def stream_documents() -> StreamingResponse:
    return StreamingResponse(_stub_event_stream(), media_type="text/event-stream")


@router.get("/{document_id}/download", response_model=StubResponse)
async def download_document(document_id: str) -> StubResponse:
    return StubResponse(endpoint="GET /api/documents/{id}/download")


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: str) -> None:
    return None
