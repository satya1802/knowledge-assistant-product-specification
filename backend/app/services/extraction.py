"""Text extraction (ingest_svc).

Extracts plain text from the four supported formats -- PDF, DOCX, TXT and
Markdown -- and nothing else: no OCR, no image captioning, no vision model
call of any kind, so embedded images are silently ignored (AC-024) and only
extracted text is ever indexed.

Every failure path raises `ExtractionError` with a short, human-readable
message suitable for `Document.failure_reason` as-is (e.g. "Password-
protected file", "No extractable text found"); `ingest_document` is the only
caller and turns this straight into the document's failed status.
"""

from __future__ import annotations

import io

from docx import Document as DocxDocument
from pypdf import PdfReader
from pypdf.errors import PdfReadError

SUPPORTED_FILE_TYPES = {"pdf", "docx", "txt", "md"}

# AC-032: the download endpoint serves the original bytes back with a
# Content-Type derived from the file's extension, never a blanket
# application/octet-stream.
CONTENT_TYPES = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
    "md": "text/markdown",
}


class ExtractionError(RuntimeError):
    """A short, human-readable reason -- used verbatim as `failure_reason`."""


def extract_text(data: bytes, file_type: str) -> str:
    """Returns the extracted text, or raises `ExtractionError`."""
    normalized_type = file_type.lower().lstrip(".")

    if normalized_type == "pdf":
        text = _extract_pdf(data)
    elif normalized_type == "docx":
        text = _extract_docx(data)
    elif normalized_type in ("txt", "md", "markdown"):
        text = _extract_plain(data)
    else:
        raise ExtractionError(f"Unsupported file type: {file_type or 'unknown'}")

    if not text or not text.strip():
        raise ExtractionError("No extractable text found")
    return text


def _extract_pdf(data: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(data))
    except (PdfReadError, Exception) as exc:  # pypdf raises several exception types
        raise ExtractionError("Corrupt or unreadable file") from exc

    if reader.is_encrypted:
        try:
            result = reader.decrypt("")
        except Exception as exc:
            raise ExtractionError("Password-protected file") from exc
        # pypdf's PasswordType.NOT_DECRYPTED == 0: an empty password did not
        # open it, so the file is genuinely password-protected.
        if int(result) == 0:
            raise ExtractionError("Password-protected file")

    try:
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:
        raise ExtractionError("Corrupt or unreadable file") from exc

    return "\n\n".join(pages)


def _extract_docx(data: bytes) -> str:
    try:
        document = DocxDocument(io.BytesIO(data))
    except Exception as exc:
        raise ExtractionError("Corrupt or unreadable file") from exc
    return "\n".join(p.text for p in document.paragraphs)


def _extract_plain(data: bytes) -> str:
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return data.decode("latin-1")
        except Exception as exc:
            raise ExtractionError("Could not decode text file") from exc
