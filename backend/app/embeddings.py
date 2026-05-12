from __future__ import annotations

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from .config import get_settings


@lru_cache
def _model() -> SentenceTransformer:
    return SentenceTransformer(get_settings().embed_model)


def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    vectors = _model().encode(
        texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    return [v.tolist() for v in vectors]


def embed_one(text: str) -> list[float]:
    return embed([text])[0]
