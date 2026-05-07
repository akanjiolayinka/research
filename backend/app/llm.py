from __future__ import annotations

from functools import lru_cache
from typing import Iterator

from groq import Groq

from .config import get_settings


@lru_cache
def _client() -> Groq:
    return Groq(api_key=get_settings().groq_api_key)


def chat_stream(messages: list[dict], temperature: float = 0.2) -> Iterator[str]:
    settings = get_settings()
    stream = _client().chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=temperature,
        stream=True,
    )
    for event in stream:
        delta = event.choices[0].delta.content if event.choices else None
        if delta:
            yield delta
