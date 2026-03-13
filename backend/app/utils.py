"""Small utility helpers shared across backend modules."""

import os
import secrets
from pathlib import Path

def generate_document_id() -> str:
    """Return a short URL-safe identifier for stored documents."""
    return secrets.token_urlsafe(12)

def ensure_dir(path: str | Path) -> None:
    """Create a directory (including parents) if it does not exist."""
    Path(path).mkdir(parents=True, exist_ok=True)

def get_file_size_bytes(file_path: str | Path) -> int:
    """Return file size in bytes."""
    return os.path.getsize(file_path)