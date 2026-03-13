"""Pydantic request/response schemas for API routes."""

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Response returned after a successful upload."""
    document_id: str
    filename: str | None = None
    size_bytes: int


class ExtractRequest(BaseModel):
    """Request payload for text extraction."""
    document_id: str
    max_pages: int = Field(default=4, ge=1, le=4)


class ExtractResponse(BaseModel):
    """Response payload after text extraction."""
    document_id: str
    pages_processed: int
    text_length: int
    preview: str
    message: str | None = None


class SummarizeRequest(BaseModel):
    """Request payload for summarization."""
    document_id: str


class SummarizeResponse(BaseModel):
    """Response payload for summarization."""
    document_id: str
    summary: str
    chunks_used: int
    chunk_size: int
    truncated: bool


class IndexRequest(BaseModel):
    """Request payload for index creation."""
    document_id: str


class IndexResponse(BaseModel):
    """Response payload for index creation."""
    document_id: str
    chunks_indexed: int
    chunk_size: int
    chunk_overlap: int


class AskRequest(BaseModel):
    """Request payload for RAG question answering."""
    document_id: str
    question: str = Field(min_length=2)
    top_k: int = 4


class SourceChunk(BaseModel):
    """Metadata for a source chunk used in an answer."""
    chunk_id: int
    score: float | None = None
    preview: str


class AskResponse(BaseModel):
    """Response payload for a RAG answer."""
    document_id: str
    question: str
    answer: str
    top_k: int
    sources: list[SourceChunk]