from __future__ import annotations

from functools import lru_cache
from typing import Any

from pinecone import Pinecone, ServerlessSpec

from .config import get_settings


@lru_cache
def _client() -> Pinecone:
    return Pinecone(api_key=get_settings().pinecone_api_key)


@lru_cache
def get_index():
    settings = get_settings()
    pc = _client()
    existing = {idx["name"] for idx in pc.list_indexes()}
    if settings.pinecone_index not in existing:
        pc.create_index(
            name=settings.pinecone_index,
            dimension=settings.embed_dim,
            metric="cosine",
            spec=ServerlessSpec(cloud=settings.pinecone_cloud, region=settings.pinecone_region),
        )
    return pc.Index(settings.pinecone_index)


def upsert(items: list[dict[str, Any]], batch_size: int = 100) -> int:
    if not items:
        return 0
    index = get_index()
    total = 0
    for start in range(0, len(items), batch_size):
        batch = items[start : start + batch_size]
        index.upsert(vectors=batch)
        total += len(batch)
    return total


def query(vector: list[float], top_k: int) -> list[dict[str, Any]]:
    res = get_index().query(vector=vector, top_k=top_k, include_metadata=True)
    matches = res.get("matches", []) if isinstance(res, dict) else res.matches
    out: list[dict[str, Any]] = []
    for m in matches:
        meta = m["metadata"] if isinstance(m, dict) else m.metadata
        score = m["score"] if isinstance(m, dict) else m.score
        out.append({"score": score, "metadata": meta or {}})
    return out
