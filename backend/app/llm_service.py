from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

from .config import settings

def get_llm():
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini_API_KEY is missing in backend/.env")
    return ChatGoogleGenerativeAI(
        model=settings.LLM_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.2,
    )

async def summarize_text(text: str) -> str:
    llm = get_llm()

    # Guardrail for V1 to avoid huge token costs
    text = text[:2000]

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant that summarizes documents clearly and concisely."),
        (
            "human",
            "Summarize the following document in bullet points.\n\n"
            "Include:\n"
            "- Key points (5-10 bullets)\n"
            "- Important dates/numbers (if any)\n"
            "- Action items (if any)\n\n"
            "Document:\n{text}",
        ),
    ])

    chain = prompt | llm

    result = await chain.ainvoke({"text": text})

    return result.content.strip()