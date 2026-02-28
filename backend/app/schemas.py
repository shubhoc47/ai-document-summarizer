from pydantic import BaseModel

class UploadResponse(BaseModel):
    document_id: str
    filename: str | None = None
    size_bytes: int

class ExtractRequest(BaseModel):
    document_id: str
    max_pages: int = 30

class ExtractResponse(BaseModel):
    document_id: str
    pages_processed: int
    text_length: int
    preview: str
    message: str | None = None

class SummarizeRequest(BaseModel):
    document_id: str

class SummarizeResponse(BaseModel):
    document_id: str
    summary: str
    chunks_used: int
    chunk_size: int
    truncated: bool