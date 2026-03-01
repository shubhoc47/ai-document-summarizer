from pydantic import BaseModel, Field

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

class IndexRequest(BaseModel):
    document_id: str

class IndexResponse(BaseModel):
    document_id: str
    chunks_indexed: int
    chunk_size: int
    chunk_overlap: int

class AskRequest(BaseModel):
    document_id: str
    question: str = Field(min_length=2)
    top_k: int = 4

class SourceChunk(BaseModel):
    chunk_id: int
    score: float | None = None
    preview: str

class AskResponse(BaseModel):
    document_id: str
    question: str
    answer: str
    top_k: int
    sources: list[SourceChunk]