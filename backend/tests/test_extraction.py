"""Unit tests for ingest_svc's text extraction, including every failure mode
AC-023 requires a short, human-readable reason for."""

import io

import pytest
from docx import Document as DocxDocument
from pypdf import PdfWriter

from app.services.extraction import ExtractionError, extract_text


def _make_pdf_bytes(text: str = "Hello from a PDF.") -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _make_encrypted_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.encrypt(user_password="secret", owner_password="secret")
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _make_docx_bytes(text: str = "Hello from a DOCX.") -> bytes:
    doc = DocxDocument()
    doc.add_paragraph(text)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def test_extracts_txt() -> None:
    text = extract_text(b"plain text content", "txt")
    assert text == "plain text content"


def test_extracts_markdown() -> None:
    text = extract_text(b"# Heading\n\nSome body text.", "md")
    assert "Heading" in text


def test_extracts_docx() -> None:
    text = extract_text(_make_docx_bytes("Hello from a DOCX."), "docx")
    assert "Hello from a DOCX." in text


def test_extracts_pdf_blank_page_has_no_text() -> None:
    # A blank page has no extractable text, so this is expected to raise
    # the "no text" failure, exercising that path distinctly from corruption.
    with pytest.raises(ExtractionError, match="No extractable text"):
        extract_text(_make_pdf_bytes(), "pdf")


def test_password_protected_pdf_fails_with_human_readable_reason() -> None:
    with pytest.raises(ExtractionError, match="Password-protected"):
        extract_text(_make_encrypted_pdf_bytes(), "pdf")


def test_corrupt_pdf_fails_with_human_readable_reason() -> None:
    with pytest.raises(ExtractionError, match="Corrupt or unreadable"):
        extract_text(b"not a real pdf file at all", "pdf")


def test_empty_txt_fails_as_no_extractable_text() -> None:
    with pytest.raises(ExtractionError, match="No extractable text"):
        extract_text(b"   \n  ", "txt")


def test_unsupported_file_type_fails() -> None:
    with pytest.raises(ExtractionError, match="Unsupported file type"):
        extract_text(b"whatever", "exe")
