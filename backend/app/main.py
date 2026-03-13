"""FastAPI application entrypoint and route handlers."""

import logging
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader

from .config import settings
from .pdf_utils import extract_text_from_pdf
from .llm_service import summarize_text
from .utils import ensure_dir, generate_document_id
from .rag_service import build_and_save_index, answer_question
from .schemas import (
    UploadResponse,
    ExtractRequest,
    ExtractResponse,
    SummarizeRequest,
    SummarizeResponse, 
    IndexRequest, 
    IndexResponse, 
    AskRequest, 
    AskResponse, 
)

logger = logging.getLogger("app")
MAX_PDF_PAGES = 4


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(title=settings.APP_NAME)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        """Simple health endpoint used by frontend startup checks."""
        return {"ok": True, "env": settings.ENV, "app": settings.APP_NAME}

    @app.post(f"{settings.API_PREFIX}/upload", response_model=UploadResponse)
    async def upload_pdf(file: UploadFile = File(...)):
        """Upload a PDF and return a generated document id."""
        if file.content_type not in ("application/pdf", "application/x-pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

        document_id = generate_document_id()
        uploads_dir = Path("storage/uploads")
        ensure_dir(uploads_dir)
        dest_path = uploads_dir / f"{document_id}.pdf"

        max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
        total_bytes = 0

        # Stream to disk to avoid loading full files in memory.
        try:
            with dest_path.open("wb") as f:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > max_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail=f"File too large. Max {settings.MAX_UPLOAD_MB} MB.",
                        )
                    f.write(chunk)
        except HTTPException:
            dest_path.unlink(missing_ok=True)
            raise
        except Exception as e:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

        if total_bytes == 0:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        try:
            page_count = len(PdfReader(str(dest_path)).pages)
        except Exception:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="Invalid or unreadable PDF file.")

        if page_count > MAX_PDF_PAGES:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400,
                detail=f"PDF must be {MAX_PDF_PAGES} pages or fewer.",
            )

        return UploadResponse(
            document_id=document_id,
            filename=file.filename,
            size_bytes=total_bytes,
        )

    @app.post(f"{settings.API_PREFIX}/extract", response_model=ExtractResponse)
    async def extract_text(req: ExtractRequest):
        """Extract text from an uploaded PDF and persist it for later steps."""
        pdf_path = Path("storage/uploads") / f"{req.document_id}.pdf"
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF not found for this document_id.")

        if req.max_pages < 1 or req.max_pages > MAX_PDF_PAGES:
            raise HTTPException(status_code=400, detail=f"max_pages must be between 1 and {MAX_PDF_PAGES}.")

        try:
            text, pages_processed = extract_text_from_pdf(pdf_path, max_pages=req.max_pages)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        if not text:
            return ExtractResponse(
                document_id=req.document_id,
                pages_processed=pages_processed,
                text_length=0,
                preview="",
                message="No extractable text found (PDF may be scanned/image-based).",
            )

        texts_dir = Path("storage/text")
        ensure_dir(texts_dir)
        (texts_dir / f"{req.document_id}.txt").write_text(text, encoding="utf-8")

        return ExtractResponse(
            document_id=req.document_id,
            pages_processed=pages_processed,
            text_length=len(text),
            preview=text[:1200],
        )

    @app.post(f"{settings.API_PREFIX}/summarize", response_model=SummarizeResponse)
    async def summarize(req: SummarizeRequest):
        """Generate and persist a summary from previously extracted text."""
        text_path = Path("storage/text") / f"{req.document_id}.txt"
        if not text_path.exists():
            raise HTTPException(
                status_code=400,
                detail="Text not found. Run /api/extract first for this document_id.",
            )

        text = text_path.read_text(encoding="utf-8").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Extracted text is empty.")

        try:
            summary, meta = await summarize_text(text)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

        summary_dir = Path("storage/summary")
        ensure_dir(summary_dir)
        (summary_dir / f"{req.document_id}.md").write_text(summary, encoding="utf-8")

        return {
            "document_id": req.document_id,
            "summary": summary,
            "chunks_used": meta["chunks_used"],
            "chunk_size": meta["chunk_size"],
            "truncated": meta["truncated"],
        }

    @app.get(f"{settings.API_PREFIX}/summary/{{document_id}}")
    def get_summary(document_id: str):
        """Fetch a saved summary by document id."""
        p = Path("storage/summary") / f"{document_id}.md"
        if not p.exists():
            raise HTTPException(status_code=404, detail="Summary not found.")
        return {"document_id": document_id, "summary": p.read_text(encoding="utf-8")}
    
    @app.post(f"{settings.API_PREFIX}/index", response_model=IndexResponse)
    async def index_document(req: IndexRequest):
        """Build and save a FAISS index for a document."""
        try:
            chunks_indexed, cfg = build_and_save_index(req.document_id)
        except FileNotFoundError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")

        return {
            "document_id": req.document_id,
            "chunks_indexed": chunks_indexed,
            "chunk_size": cfg.chunk_size,
            "chunk_overlap": cfg.chunk_overlap,
        }


    @app.post(f"{settings.API_PREFIX}/ask", response_model=AskResponse)
    async def ask_question(req: AskRequest):
        """Answer a question using the document's vector index."""
        try:
            answer, sources = await answer_question(
                document_id=req.document_id,
                question=req.question,
                top_k=req.top_k,
            )
        except FileNotFoundError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ask failed: {str(e)}")

        return {
            "document_id": req.document_id,
            "question": req.question,
            "answer": answer,
            "top_k": req.top_k,
            "sources": sources,
        }

    return app


# --- App bootstrap ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)

app = create_app()
logger.info("Starting %s in %s", settings.APP_NAME, settings.ENV)