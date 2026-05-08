from __future__ import annotations

from typing import Iterator

from .config import get_settings
from .embeddings import embed_one
from .llm import chat_stream
from .vectorstore import query

SYSTEM_PROMPT = (
    "You are a helpful research assistant. Answer the user's question using ONLY the "
    "context provided. Cite sources inline as [source_filename]. If the answer cannot "
    "be found in the context, say you don't know. Be concise and accurate."
)


def _format_context(matches: list[dict]) -> str:
    lines: list[str] = []
    for i, m in enumerate(matches, 1):
        meta = m.get("metadata", {})
        src = meta.get("source", "unknown")
        text = meta.get("text", "")
        lines.append(f"[{i}] source: {src}\n{text}")
    return "\n\n---\n\n".join(lines)


def retrieve(
    question: str,
    top_k: int | None = None,
    namespace: str | None = None,
) -> list[dict]:
    k = top_k or get_settings().top_k
    vec = embed_one(question)
    return query(vec, top_k=k, namespace=namespace)


def build_messages(question: str, matches: list[dict]) -> list[dict]:
    context = _format_context(matches) or "(no context retrieved)"
    user = f"Context:\n{context}\n\nQuestion: {question}"
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user},
    ]


def unique_sources(matches: list[dict]) -> list[str]:
    seen: list[str] = []
    for m in matches:
        src = m.get("metadata", {}).get("source")
        if src and src not in seen:
            seen.append(src)
    return seen


def chunks_payload(matches: list[dict]) -> list[dict]:
    out: list[dict] = []
    for m in matches:
        meta = m.get("metadata") or {}
        out.append(
            {
                "source": meta.get("source", "unknown"),
                "chunk_idx": int(meta.get("chunk_idx", 0)),
                "score": float(m.get("score", 0.0)),
                "text": meta.get("text", ""),
            }
        )
    return out


def answer_stream(
    question: str,
    top_k: int | None = None,
    namespace: str | None = None,
) -> Iterator[dict]:
    matches = retrieve(question, top_k=top_k, namespace=namespace)
    sources = unique_sources(matches)
    yield {"type": "sources", "sources": sources, "chunks": chunks_payload(matches)}
    messages = build_messages(question, matches)
    for token in chat_stream(messages):
        yield {"type": "token", "text": token}
    yield {"type": "done"}
