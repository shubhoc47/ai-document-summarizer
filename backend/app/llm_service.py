from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain.text_splitter import RecursiveCharacterTextSplitter

from .config import settings


def get_llm():
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing in backend/.env")

    return ChatGoogleGenerativeAI(
        model=settings.LLM_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,
    )


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    return splitter.split_text(text)


async def summarize_text(text: str) -> tuple[str, dict]:
    llm = get_llm()

    # --- Chunking config (Part 7) ---
    CHUNK_SIZE = 6000
    CHUNK_OVERLAP = 400

    chunks = chunk_text(text, chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)

    # --- Cost guardrail ---
    MAX_CHUNKS = 12
    truncated = len(chunks) > MAX_CHUNKS
    if truncated:
        chunks = chunks[:MAX_CHUNKS]

    map_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant that summarizes documents clearly and concisely."),
        ("human", "Summarize this chunk in 5-8 bullet points.\n\nChunk:\n{text}"),
    ])

    reduce_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant that writes a final summary from chunk summaries."),
        (
            "human",
            "Combine the following chunk summaries into ONE final summary in bullet points.\n\n"
            "Include:\n"
            "- Key points (5-10 bullets)\n"
            "- Important dates/numbers (if any)\n"
            "- Action items (if any)\n\n"
            "Chunk summaries:\n{summaries}"
        ),
    ])

    # Map: summarize each chunk
    chunk_summaries = []
    for c in chunks:
        res = await (map_prompt | llm).ainvoke({"text": c})
        chunk_summaries.append(res.content.strip())

    # Reduce: combine
    final = await (reduce_prompt | llm).ainvoke({"summaries": "\n\n".join(chunk_summaries)})
    summary = final.content.strip()

    meta = {
        "chunks_used": len(chunks),
        "chunk_size": CHUNK_SIZE,
        "truncated": truncated,
    }
    return summary, meta