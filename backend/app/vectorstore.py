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


def upsert(
    items: list[dict[str, Any]],
    batch_size: int = 100,
    namespace: str | None = None,
) -> int:
    if not items:
        return 0
    index = get_index()
    total = 0
    kwargs: dict[str, Any] = {}
    if namespace:
        kwargs["namespace"] = namespace
    for start in range(0, len(items), batch_size):
        batch = items[start : start + batch_size]
        index.upsert(vectors=batch, **kwargs)
        total += len(batch)
    return total


def query(
    vector: list[float],
    top_k: int,
    namespace: str | None = None,
) -> list[dict[str, Any]]:
    kwargs: dict[str, Any] = {"vector": vector, "top_k": top_k, "include_metadata": True}
    if namespace:
        kwargs["namespace"] = namespace
    res = get_index().query(**kwargs)
    matches = res.get("matches", []) if isinstance(res, dict) else res.matches
    out: list[dict[str, Any]] = []
    for m in matches:
        meta = m["metadata"] if isinstance(m, dict) else m.metadata
        score = m["score"] if isinstance(m, dict) else m.score
        out.append({"score": score, "metadata": meta or {}})
    return out


def existing_ids(ids: list[str], namespace: str | None = None) -> set[str]:
    """Return the subset of `ids` that already have vectors in Pinecone."""
    if not ids:
        return set()
    kwargs: dict[str, Any] = {"ids": ids}
    if namespace:
        kwargs["namespace"] = namespace
    try:
        res = get_index().fetch(**kwargs)
    except Exception:
        # If fetch fails (e.g. transient network error), assume nothing exists
        # so dedup degrades to "always upsert" rather than blocking ingest.
        return set()
    vectors = res.get("vectors", {}) if isinstance(res, dict) else getattr(res, "vectors", {})
    return set(vectors.keys()) if vectors else set()
