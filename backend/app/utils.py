import os
import secrets
from pathlib import Path 

def generate_document_id() -> str:
	# short, url-safe id
	return secrets.token_urlsafe(12)

def ensure_dir(path: str | Path) -> None:
	Path(path).mkdir(parents=True, exist_ok=True)

def get_file_size_bytes(file_path: str | Path) -> int:
	return os.path_getsize(file_path)