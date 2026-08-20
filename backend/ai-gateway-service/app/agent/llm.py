"""
OpenRouter exposes an OpenAI-API-compatible endpoint — this is why a
plain langchain_openai.ChatOpenAI works here unmodified; only the
base_url and api_key point somewhere other than OpenAI itself. No
OpenRouter-specific LangChain integration needed.
"""

from langchain_openai import ChatOpenAI

from app.config import settings


def get_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=settings.openrouter_model,
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
        temperature=0,
    )
