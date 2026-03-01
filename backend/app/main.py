import logging
import shutil
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .pdf_utils import extract_text_from_pdf  # ✅ ensure your file is named pdf_utils.py
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
    SourceChunk
)

logger = logging.getLogger("app")


def create_app() -> FastAPI:
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
        return {"ok": True, "env": settings.ENV, "app": settings.APP_NAME}

    @app.post(f"{settings.API_PREFIX}/upload", response_model=UploadResponse)
    async def upload_pdf(file: UploadFile = File(...)):
        # Validate content type
        if file.content_type not in ("application/pdf", "application/x-pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

        document_id = generate_document_id()
        uploads_dir = Path("storage/uploads")
        ensure_dir(uploads_dir)
        dest_path = uploads_dir / f"{document_id}.pdf"

        max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
        total_bytes = 0

        # Stream write to disk (more memory-safe than await file.read())
        try:
            with dest_path.open("wb") as f:
                while True:
                    chunk = await file.read(1024 * 1024)  # 1MB
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
            # cleanup partial file
            dest_path.unlink(missing_ok=True)
            raise
        except Exception as e:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

        if total_bytes == 0:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        return UploadResponse(
            document_id=document_id,
            filename=file.filename,
            size_bytes=total_bytes,
        )

    @app.post(f"{settings.API_PREFIX}/extract", response_model=ExtractResponse)
    async def extract_text(req: ExtractRequest):
        pdf_path = Path("storage/uploads") / f"{req.document_id}.pdf"
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF not found for this document_id.")

        if req.max_pages < 1 or req.max_pages > 200:
            raise HTTPException(status_code=400, detail="max_pages must be between 1 and 200.")

        text, pages_processed = extract_text_from_pdf(pdf_path, max_pages=req.max_pages)

        # Save extracted text (even if empty? we’ll only save when non-empty)
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

        # Optional: persist summary
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
        p = Path("storage/summary") / f"{document_id}.md"
        if not p.exists():
            raise HTTPException(status_code=404, detail="Summary not found.")
        return {"document_id": document_id, "summary": p.read_text(encoding="utf-8")}
    
    @app.post(f"{settings.API_PREFIX}/index", response_model=IndexResponse)
    async def index_document(req: IndexRequest):
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