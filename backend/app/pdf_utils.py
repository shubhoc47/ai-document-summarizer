"""PDF text extraction helpers."""

from pathlib import Path
from typing import Tuple
from pypdf import PdfReader

MAX_PDF_PAGES = 4


def extract_text_from_pdf(pdf_path: Path, max_pages: int = 30) -> Tuple[str, int]:
    """Extract text from a PDF and return `(text, pages_processed)`."""
    if max_pages < 1 or max_pages > MAX_PDF_PAGES:
        raise ValueError(f"max_pages must be between 1 and {MAX_PDF_PAGES}.")

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    if total_pages > MAX_PDF_PAGES:
        raise ValueError(f"PDF must be {MAX_PDF_PAGES} pages or fewer.")

    pages_to_read = min(total_pages, max_pages)

    parts: list[str] = []
    for i in range(pages_to_read):
        page = reader.pages[i]
        page_text = page.extract_text() or ""
        page_text = page_text.replace("\x00", "").strip()
        if page_text:
            parts.append(page_text)

    text = "\n\n".join(parts).strip()
    return text, pages_to_read