import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, HTTPException
from pathlib import Path
from .utils import generate_document_id, ensure_dir
from .config import settings
from pydantic import BaseModel
from .pdf_utils import extract_text_from_pdf

logger = logging.getLogger("app")

class ExtractRequest(BaseModel):
    document_id: str
    max_pages: int = 30


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():
        return {"ok": True, "env": settings.ENV, "app": settings.APP_NAME}

    @app.post(f"{settings.API_PREFIX}/upload")
    async def upload_pdf(file: UploadFile = File(...)):
        if file.content_type not in ("application/pdf", "application/x-pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

        document_id = generate_document_id()
        uploads_dir = Path("storage/uploads")
        ensure_dir(uploads_dir)
        dest_path = uploads_dir / f"{document_id}.pdf"

        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max {settings.MAX_UPLOAD_MB} MB.",
            )

        dest_path.write_bytes(contents)

        return {
            "document_id": document_id,
            "filename": file.filename,
            "size_bytes": len(contents),
        }

    # ✅ IMPORTANT: This must be at the same indentation level as upload_pdf
    @app.post(f"{settings.API_PREFIX}/extract")
    async def extract_text(req: ExtractRequest):
        pdf_path = Path("storage/uploads") / f"{req.document_id}.pdf"
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF not found for this document_id.")

        if req.max_pages < 1 or req.max_pages > 200:
            raise HTTPException(status_code=400, detail="max_pages must be between 1 and 200.")

        text, pages_processed = extract_text_from_pdf(pdf_path, max_pages=req.max_pages)

        if not text:
            return {
                "document_id": req.document_id,
                "pages_processed": pages_processed,
                "text_length": 0,
                "preview": "",
                "message": "No extractable text found (PDF may be scanned/image-based).",
            }

        texts_dir = Path("storage/text")
        ensure_dir(texts_dir)
        (texts_dir / f"{req.document_id}.txt").write_text(text, encoding="utf-8")

        return {
            "document_id": req.document_id,
            "pages_processed": pages_processed,
            "text_length": len(text),
            "preview": text[:1200],
        }

    return app


app = create_app()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger.info("Starting %s in %s", settings.APP_NAME, settings.ENV)