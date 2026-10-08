"""In-app product documentation routes.

Getting-started and API-reference content the SPA's docs screens render.
The architecture names no dedicated service for this content -- it is
served by api_gateway itself, since it is static content rather than
business logic.

Both screens (`GettingStarted.tsx`, `ApiReference.tsx`) currently render
their own copy of this content directly rather than fetching it, so nothing
in the SPA depends on the exact wording returned here -- but the endpoints
themselves are still part of the approved contract (AC: GET
/api/docs/getting-started, GET /api/docs/api-reference), and any API
consumer that calls them directly deserves real content rather than a
placeholder. Both are public: the sign-in screen itself links to them
before a session exists, so neither requires a session cookie.
"""

from fastapi import APIRouter

from app.schemas import DocsContentResponse

router = APIRouter(prefix="/api/docs", tags=["docs"])

_GETTING_STARTED_MARKDOWN = """\
# Getting started with Knowledge Assistant

## Asking a question

Type a question the way you would ask a colleague. Every question is
searched against the shared knowledge base before the assistant writes an
answer.

- Press Enter to send, Shift + Enter for a new line.
- Be specific: "What is the notice period in the UK contract template?"
  finds more than "notice period".
- Follow-up questions keep their place in the same conversation.
- Starting a new chat begins with a clean slate -- nothing from a previous
  conversation carries over.

## What the source chips mean

Numbered chips under an answer point to the document each statement was
drawn from.

- A chip's number matches the bracketed reference in the answer text, so
  `[2]` in a sentence is chip 2 below it.
- Clicking a chip shows the exact excerpt that was used, along with the
  file name, type and who uploaded it.
- An answer labelled "General knowledge" has no chips: nothing in the
  library was relevant enough, so treat it like any general answer.
- If the source document has since been deleted, the chip says so rather
  than failing silently.

## Uploading documents

Add PDF, Word, plain text or Markdown files from the Knowledge base page so
the assistant can cite them.

- Drag files onto the dropzone on the Knowledge base page, or choose them
  from your computer.
- A file shows as Processing while it is parsed and indexed, then flips to
  Ready on its own.
- Failed uploads show a short reason, such as a password-protected PDF or a
  scanned page with no text layer.
- Only text content is indexed; images and charts inside a file are not
  read.

## One shared, open knowledge base

There is a single company-wide library. Everything any signed-in employee
uploads is answerable by everyone else, and administrators have no extra
document rights.

- Any signed-in employee may upload, download or delete any document,
  whoever added it.
- Deletion is permanent: there is no recycle bin, so you are always asked
  to confirm first.
- Your conversations, by contrast, stay private to your own account --
  nobody else can read them.
"""

_API_REFERENCE_MARKDOWN = """\
# Knowledge Assistant API reference

Every HTTP endpoint behind this product: authentication, the shared
knowledge base, streamed chat and your private conversations. These are the
application's own endpoints -- nothing here calls a model provider
directly, and no key or credential value appears anywhere in this
reference.

## Authentication

- `POST /api/auth/register` -- create a new account (name, email, password).
- `POST /api/auth/login` -- exchange email and password for a session
  cookie.
- `POST /api/auth/logout` -- revoke the current session and clear the
  cookie.
- `GET /api/auth/me` -- the signed-in user, or null, plus whether
  self-registration is open.
- `POST /api/auth/change-password` -- change your own password after
  verifying the current one.

## Documents

- `GET /api/documents` -- list the shared library with stats, search and
  status/type filters.
- `POST /api/documents` -- upload one or more files (`multipart/form-data`).
- `GET /api/documents/stream` -- server-sent events for live ingestion
  status.
- `GET /api/documents/{document_id}/download` -- download the original file,
  unchanged.
- `DELETE /api/documents/{document_id}` -- permanently delete a document,
  its chunks and its embeddings.

## Chat

- `POST /api/chat` -- ask a question; streams the grounded (or
  general-knowledge) answer with citations over SSE.
- `POST /api/chat/{message_id}/regenerate` -- re-ask the same question and
  stream a fresh answer in its place.

## Conversations

- `GET /api/conversations` -- your own conversations, newest first,
  optionally filtered by `q`.
- `GET /api/conversations/{conversation_id}` -- the full private thread with
  messages and citations.
- `DELETE /api/conversations/{conversation_id}` -- permanently delete a
  conversation and its messages.

Every endpoint above other than `register` and `login` requires the session
cookie set at sign-in.
"""


@router.get("/getting-started", response_model=DocsContentResponse)
async def getting_started() -> DocsContentResponse:
    return DocsContentResponse(markdown=_GETTING_STARTED_MARKDOWN)


@router.get("/api-reference", response_model=DocsContentResponse)
async def api_reference() -> DocsContentResponse:
    return DocsContentResponse(markdown=_API_REFERENCE_MARKDOWN)
