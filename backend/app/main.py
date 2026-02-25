import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File, HTTPException
from pathlib import Path
from .utils import generate_document_id, ensure_dir
from .config import settings

logger = logging.getLogger("app")


def create_app() -> FastAPI:
    app = FastAPI(title=settings.APP_NAME)

    # CORS for local dev (React dev server)
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
        # 1) Validate content-type (best-effort)
        if file.content_type not in ("application/pdf", "application/x-pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

        # 2) Create destination
        document_id = generate_document_id()
        uploads_dir = Path("storage/uploads")
        ensure_dir(uploads_dir)

        dest_path = uploads_dir / f"{document_id}.pdf"

        # 3) Save file to disk
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Optional: size guardrail (based on bytes read)
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
        
    return app


app = create_app()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger.info("Starting %s in %s", settings.APP_NAME, settings.ENV)