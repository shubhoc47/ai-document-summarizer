from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

# Vector store (FAISS)
from langchain_community.vectorstores import FAISS

# Embeddings (Gemini)
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from .config import settings
from .utils import ensure_dir
from .llm_service import get_llm


@dataclass
class RagConfig:
    chunk_size: int = 900
    chunk_overlap: int = 150
    max_chunks: int = 2000  # safety guardrail


def _get_embeddings():
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing in backend/.env")

    return GoogleGenerativeAIEmbeddings(
        google_api_key=settings.GEMINI_API_KEY,
        model="models/gemini-embedding-001",
    )


def _index_dir() -> Path:
    p = Path("storage/index")
    ensure_dir(p)
    return p


def _doc_index_path(document_id: str) -> Path:
    # FAISS saves as a directory (index.faiss + index.pkl)
    return _index_dir() / document_id


def _load_extracted_text(document_id: str) -> str:
    text_path = Path("storage/text") / f"{document_id}.txt"
    if not text_path.exists():
        raise FileNotFoundError("Text not found. Run /api/extract first for this document_id.")
    return text_path.read_text(encoding="utf-8").strip()


def _chunk_text(text: str, cfg: RagConfig) -> List[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=cfg.chunk_size,
        chunk_overlap=cfg.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)

    if len(chunks) > cfg.max_chunks:
        chunks = chunks[: cfg.max_chunks]

    docs: List[Document] = []
    for i, c in enumerate(chunks):
        docs.append(Document(page_content=c, metadata={"chunk_id": i}))
    return docs


def build_and_save_index(document_id: str, cfg: RagConfig = RagConfig()) -> Tuple[int, RagConfig]:
    text = _load_extracted_text(document_id)
    if not text:
        raise ValueError("Extracted text is empty.")

    docs = _chunk_text(text, cfg)
    embeddings = _get_embeddings()

    vs = FAISS.from_documents(docs, embeddings)

    save_path = _doc_index_path(document_id)
    ensure_dir(save_path)
    vs.save_local(str(save_path))

    return len(docs), cfg


def load_index(document_id: str) -> FAISS:
    save_path = _doc_index_path(document_id)
    if not save_path.exists():
        raise FileNotFoundError("Vector index not found. Run /api/index first for this document_id.")

    embeddings = _get_embeddings()

    # allow_dangerous_deserialization is required by LangChain when loading pickle metadata
    vs = FAISS.load_local(
        str(save_path),
        embeddings,
        allow_dangerous_deserialization=True,
    )
    return vs


async def answer_question(document_id: str, question: str, top_k: int = 4) -> Tuple[str, list[dict]]:
    if top_k < 1 or top_k > 10:
        raise ValueError("top_k must be between 1 and 10.")

    vs = load_index(document_id)

    # ✅ Retrieve relevant chunks WITH scores (FAISS distance; lower = more similar)
    docs_with_scores = vs.similarity_search_with_score(question, k=top_k)

    # ---- Low-confidence filter guardrail ----
    # In FAISS (L2 distance), smaller = better match. Threshold depends on embeddings/model.
    # Start conservative. If you see too many false negatives, increase it slightly.
    SCORE_THRESHOLD = 1.2

    sources = []
    context_parts = []

    for d, score in docs_with_scores:
        # Filter out weak matches
        if score is None:
            continue
        if float(score) > SCORE_THRESHOLD:
            continue

        chunk_id = d.metadata.get("chunk_id", -1)
        content = (d.page_content or "").strip()
        if not content:
            continue

        context_parts.append(f"[Chunk {chunk_id} | score={float(score):.3f}]\n{content}")
        sources.append(
            {
                "chunk_id": int(chunk_id) if chunk_id is not None else -1,
                "score": float(score),
                "preview": content[:280],
            }
        )

    # If no chunks passed the threshold, avoid hallucination
    if not context_parts:
        return (
            "I couldn’t find relevant information in the document to answer that question. "
            "Try rephrasing your question or asking for a specific section/keyword.",
            [],
        )

    context = "\n\n---\n\n".join(context_parts)

    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You answer questions using ONLY the provided context. "
                "If the answer is not in the context, say you don't know.",
            ),
            (
                "human",
                "Question:\n{question}\n\n"
                "Context:\n{context}\n\n"
                "Answer clearly. If helpful, use bullet points.",
            ),
        ]
    )

    result = await (prompt | llm).ainvoke({"question": question, "context": context})
    answer = result.content.strip()

    return answer, sources