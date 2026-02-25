# AI Document Summarizer (RAG)

An AI-powered document summarization and question-answering system.

## Features
- Upload PDF documents
- Automatic summarization
- Semantic search
- Ask questions about documents (RAG)
- Explain complex sections

## Tech Stack
- FastAPI (backend)
- React (frontend)
- LangChain
- OpenAI embeddings & LLM
- FAISS vector search
- AWS deployment (planned)

## Run locally

### Backend
cd backend
uvicorn app.main:app --reload

### Frontend
cd frontend
npm run dev