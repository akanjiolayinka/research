from __future__ import annotations

from functools import lru_cache
from typing import Any

from sentence_transformers import CrossEncoder

from .config import get_settings


@lru_cache
def _model() -> CrossEncoder:
    return CrossEncoder(get_settings().rerank_model)


def rerank(query: str, matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Score (query, chunk_text) pairs with a cross-encoder. Mutates each
    match dict by adding `rerank_score`, then returns matches sorted by it
    descending."""
    if not matches:
        return []
    pairs = [(query, m.get("metadata", {}).get("text", "")) for m in matches]
    scores = _model().predict(pairs)
    for m, s in zip(matches, scores):
        m["rerank_score"] = float(s)
    matches.sort(key=lambda m: m["rerank_score"], reverse=True)
    return matches
