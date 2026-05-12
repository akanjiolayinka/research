from __future__ import annotations

import re
from typing import Iterator

from . import memory
from .config import get_settings
from .embeddings import embed_one
from .llm import chat_once, chat_stream
from .reranker import rerank as rerank_matches
from .vectorstore import query

NO_CONTEXT_MESSAGE = (
    "I couldn't find relevant information in the knowledge base to answer that."
)

SYSTEM_PROMPT = (
    "You are a helpful research assistant. Answer the user's question using ONLY the "
    "context provided. Cite sources inline as [source_filename]. If the answer cannot "
    "be found in the context, say you don't know. Be concise and accurate."
)

REWRITE_SYSTEM = (
    "You rewrite follow-up questions into standalone, self-contained questions "
    "optimized for vector search. Output ONLY the rewritten question, nothing else."
)

# Heuristic: short messages or those containing referential pronouns/phrases are
# likely follow-ups that depend on prior turns.
_FOLLOWUP_PATTERN = re.compile(
    r"\b(it|its|that|this|those|these|they|them|their|"
    r"the (?:first|second|third|fourth|previous|same|other|above|former|latter))\b",
    re.IGNORECASE,
)


def is_followup(message: str) -> bool:
    words = message.split()
    if len(words) <= 5:
        return True
    return bool(_FOLLOWUP_PATTERN.search(message))


def rewrite_query(message: str, history: list[dict]) -> str:
    """Return a standalone, retrieval-optimized version of `message` if it
    looks like a follow-up; otherwise return `message` unchanged."""
    if not history or not is_followup(message):
        return message
    recent = history[-2:]
    transcript = "\n".join(f"{t['role'].title()}: {t['content']}" for t in recent)
    user = (
        f"Previous turns:\n{transcript}\n\n"
        f"Follow-up question: {message}\n\n"
        "Standalone question:"
    )
    try:
        rewritten = chat_once(
            [
                {"role": "system", "content": REWRITE_SYSTEM},
                {"role": "user", "content": user},
            ],
            temperature=0.0,
            max_tokens=120,
        )
    except Exception:
        return message
    rewritten = rewritten.strip().strip('"').strip("`")
    return rewritten or message


def _format_context(matches: list[dict]) -> str:
    lines: list[str] = []
    for i, m in enumerate(matches, 1):
        meta = m.get("metadata", {}) or {}
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


def build_messages(
    question: str,
    matches: list[dict],
    history: list[dict] | None = None,
) -> list[dict]:
    context = _format_context(matches) or "(no context retrieved)"
    msgs: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history or []:
        msgs.append({"role": turn["role"], "content": turn["content"]})
    msgs.append(
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
    )
    return msgs


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
                "rerank_score": float(m.get("rerank_score", 0.0)),
                "text": meta.get("text", ""),
            }
        )
    return out


def answer_stream(
    question: str,
    session_id: str = "",
    top_k: int | None = None,
    namespace: str | None = None,
) -> Iterator[dict]:
    """Full pipeline: history → rewrite → embed → retrieve → rerank →
    guardrail → generate → stream. Mutates the conversation buffer for
    `session_id` (no-op if empty)."""
    settings = get_settings()
    history = memory.get(session_id)

    rewritten = rewrite_query(question, history)
    if rewritten != question:
        yield {"type": "rewrite", "original": question, "rewritten": rewritten}

    matches = retrieve(rewritten, top_k=top_k, namespace=namespace)
    if matches:
        matches = rerank_matches(rewritten, matches)
        matches = matches[: settings.top_k_rerank]

    sources = unique_sources(matches)
    yield {
        "type": "sources",
        "sources": sources,
        "chunks": chunks_payload(matches),
    }

    best_rerank = max((m.get("rerank_score", 0.0) for m in matches), default=0.0)
    if not matches or best_rerank < settings.min_rerank_score:
        yield {"type": "token", "text": NO_CONTEXT_MESSAGE}
        memory.append(session_id, "user", question)
        memory.append(session_id, "assistant", NO_CONTEXT_MESSAGE)
        yield {"type": "done", "guardrail": "no_relevant_context"}
        return

    messages = build_messages(question, matches, history=history)
    full = ""
    for token in chat_stream(messages):
        full += token
        yield {"type": "token", "text": token}

    memory.append(session_id, "user", question)
    memory.append(session_id, "assistant", full)
    yield {"type": "done"}
